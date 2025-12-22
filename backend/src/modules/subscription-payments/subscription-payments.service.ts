import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { UserRole } from '../../common/enums/user-role.enum';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingCycle, Subscription, SubscriptionDocument, SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { convertLegacyFeaturesToKeys } from '../subscriptions/utils/plan-features.helper';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CreateSubscriptionPaymentMethodDto } from './dto/create-subscription-payment-method.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { ManualActivationDto } from './dto/manual-activation.dto';
import { SubmitPaymentRequestDto } from './dto/submit-payment-request.dto';
import { UpdateSubscriptionPaymentMethodDto } from './dto/update-subscription-payment-method.dto';
import { VerifyPaymentRequestDto } from './dto/verify-payment-request.dto';
import {
    PaymentGateway,
    SubscriptionPaymentMethod,
    SubscriptionPaymentMethodDocument,
} from './schemas/subscription-payment-method.schema';
import {
    PaymentRequestStatus,
    SubscriptionPaymentRequest,
    SubscriptionPaymentRequestDocument,
} from './schemas/subscription-payment-request.schema';
import { getBillingCycleDays, getPayPalBillingInterval, getStripeBillingInterval } from './utils/billing-cycle.helper';
@Injectable()
export class SubscriptionPaymentsService {
  private stripe: Stripe;
  constructor(
    private configService: ConfigService,
    @InjectModel(SubscriptionPaymentMethod.name)
    private paymentMethodModel: Model<SubscriptionPaymentMethodDocument>,
    @InjectModel(SubscriptionPaymentRequest.name)
    private paymentRequestModel: Model<SubscriptionPaymentRequestDocument>,
    @InjectModel(Company.name)
    private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private subscriptionPlansService: SubscriptionPlansService,
    private websocketsGateway: WebsocketsGateway,
    private notificationsService: NotificationsService,
  ) {
    const stripeKey = this.configService.get('stripe.secretKey');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });
    }
  }
  // Get all available payment methods (for public/company use - only active)
  async getAvailablePaymentMethods(countryCode?: string, currency?: string) {
    const query: any = { isActive: true };
    // Filter by country if provided
    if (countryCode) {
      query.$or = [
        { supportedCountries: { $size: 0 } }, // Worldwide
        { supportedCountries: countryCode }, // Country-specific
      ];
    }
    // Filter by currency if provided
    if (currency) {
      query.$and = [
        {
          $or: [
            { supportedCurrencies: { $size: 0 } }, // All currencies
            { supportedCurrencies: currency }, // Currency-specific
          ],
        },
      ];
    }
    // Sort by: isDefault (desc), then sortOrder, then name
    return this.paymentMethodModel
      .find(query)
      .sort({ isDefault: -1, sortOrder: 1, name: 1 })
      .exec();
  }
  // Get all payment methods (for super admin - includes inactive)
  async getAllPaymentMethods() {
    const methods = await this.paymentMethodModel.find().sort({ isDefault: -1, sortOrder: 1, name: 1 }).exec();
    // Transform to ensure 'id' field exists
    return methods.map((method) => ({
      ...method.toObject(),
      id: method._id.toString(),
    }));
  }
  // Get payment method by ID
  async getPaymentMethodById(id: string) {
    const paymentMethod = await this.paymentMethodModel.findById(id);
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }
  // Create payment method
  async createPaymentMethod(dto: CreateSubscriptionPaymentMethodDto) {
    // Check if code already exists
    const existing = await this.paymentMethodModel.findOne({ code: dto.code });
    if (existing) {
      throw new BadRequestException(`Payment method with code "${dto.code}" already exists`);
    }
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.paymentMethodModel.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }
    const paymentMethod = new this.paymentMethodModel({
      ...dto,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      sortOrder: dto.sortOrder ?? 0,
      supportedCountries: dto.supportedCountries ?? [],
      supportedCurrencies: dto.supportedCurrencies ?? [],
    });
    return paymentMethod.save();
  }
  // Update payment method
  async updatePaymentMethod(id: string, dto: UpdateSubscriptionPaymentMethodDto) {
    const paymentMethod = await this.paymentMethodModel.findById(id);
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    // If code is being updated, check for duplicates
    if (dto.code && dto.code !== paymentMethod.code) {
      const existing = await this.paymentMethodModel.findOne({ code: dto.code });
      if (existing) {
        throw new BadRequestException(`Payment method with code "${dto.code}" already exists`);
      }
    }
    // If setting as default, unset other defaults (except current one)
    if (dto.isDefault && !paymentMethod.isDefault) {
      await this.paymentMethodModel.updateMany(
        { _id: { $ne: id }, isDefault: true },
        { $set: { isDefault: false } },
      );
    }
    Object.assign(paymentMethod, dto);
    return paymentMethod.save();
  }
  // Delete payment method
  async deletePaymentMethod(id: string) {
    const paymentMethod = await this.paymentMethodModel.findById(id);
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    await this.paymentMethodModel.findByIdAndDelete(id);
    return { message: 'Payment method deleted successfully' };
  }
  // Toggle payment method status
  async togglePaymentMethodStatus(id: string) {
    const paymentMethod = await this.paymentMethodModel.findById(id);
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    paymentMethod.isActive = !paymentMethod.isActive;
    return paymentMethod.save();
  }
  // Initialize payment based on gateway
  async initializePayment(dto: CreateSubscriptionPaymentDto) {
    const { companyId, planName, paymentGateway, paymentDetails, paymentMethodId } = dto;
    // Get company
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    // Get plan
    const plan = await this.subscriptionPlansService.findByName(planName);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    // Get payment method config
    // For MANUAL gateway, prefer paymentMethodId if provided, otherwise find first active one
    let paymentMethod: SubscriptionPaymentMethodDocument | null;
    if (paymentGateway === PaymentGateway.MANUAL && paymentMethodId) {
      paymentMethod = await this.paymentMethodModel.findById(paymentMethodId);
      if (!paymentMethod || !paymentMethod.isActive) {
        throw new NotFoundException('Payment method not found or inactive');
      }
    } else {
      paymentMethod = await this.paymentMethodModel.findOne({
        gateway: paymentGateway,
        isActive: true,
      });
    }
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not available');
    }
    // Route to appropriate gateway
    switch (paymentGateway) {
      case PaymentGateway.STRIPE:
        return this.initializeStripePayment(company, plan, paymentMethod);
      case PaymentGateway.PAYPAL:
        return this.initializePayPalPayment(company, plan, paymentMethod);
      case PaymentGateway.GOOGLE_PAY:
        return this.initializeGooglePayPayment(company, plan, paymentMethod);
      case PaymentGateway.BKASH:
        return this.initializeBkashPayment(company, plan, paymentMethod, paymentDetails);
      case PaymentGateway.NAGAD:
        return this.initializeNagadPayment(company, plan, paymentMethod, paymentDetails);
      case PaymentGateway.MANUAL:
        return this.initializeManualPayment(company, plan, paymentMethod);
      default:
        throw new BadRequestException(`Payment gateway ${paymentGateway} not implemented`);
    }
  }
  // Stripe payment initialization
  private async initializeStripePayment(company: CompanyDocument, plan: any, paymentMethod: SubscriptionPaymentMethodDocument) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    // Create or get Stripe customer
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: { companyId: company._id.toString() },
      });
      customerId = customer.id;
      await this.companyModel.findByIdAndUpdate(company._id, {
        stripeCustomerId: customerId,
      });
    }
    // Get billing interval for Stripe (supports monthly, quarterly, yearly)
    const billingCycle = plan.billingCycle || BillingCycle.MONTHLY;
    const stripeInterval = getStripeBillingInterval(billingCycle);
    
    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.displayName || plan.name,
              description: `Subscription for ${company.name}`,
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: stripeInterval.interval as 'month' | 'year',
              interval_count: stripeInterval.intervalCount,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions?canceled=true`,
      metadata: {
        companyId: company._id.toString(),
        planName: plan.name,
      },
    });
    return {
      gateway: PaymentGateway.STRIPE,
      sessionId: session.id,
      url: session.url,
      clientSecret: null,
    };
  }
  // PayPal payment initialization
  private async initializePayPalPayment(company: CompanyDocument, plan: any, paymentMethod: SubscriptionPaymentMethodDocument) {
    const paypalClientId = paymentMethod.config?.clientId || this.configService.get('paypal.clientId');
    const paypalSecret = paymentMethod.config?.secret || this.configService.get('paypal.secret');
    const paypalMode = paymentMethod.config?.mode || this.configService.get('paypal.mode') || 'sandbox';
    if (!paypalClientId || !paypalSecret) {
      throw new BadRequestException('PayPal is not configured. Please provide client ID and secret in payment method config or environment variables.');
    }
    // PayPal subscription creation using REST API
    // Note: This requires PayPal REST API v2 for subscriptions
    const baseUrl = paypalMode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to authenticate with PayPal');
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Create PayPal product
    const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `product-${company._id}-${Date.now()}`,
      },
      body: JSON.stringify({
        name: plan.displayName || plan.name,
        description: `Subscription for ${company.name}`,
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    });
    let productId: string;
    if (productResponse.ok) {
      const productData = await productResponse.json();
      productId = productData.id;
    } else {
      // Use a default product ID or create one
      productId = 'PROD-' + company._id.toString().slice(-8);
    }
    // Get billing interval for PayPal (supports monthly, quarterly, yearly)
    const billingCycle = plan.billingCycle || BillingCycle.MONTHLY;
    const paypalInterval = getPayPalBillingInterval(billingCycle);
    const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `plan-${company._id}-${Date.now()}`,
      },
      body: JSON.stringify({
        product_id: productId,
        name: `${plan.displayName || plan.name} - ${company.name}`,
        description: `Subscription plan for ${company.name}`,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: paypalInterval.intervalUnit,
              interval_count: paypalInterval.intervalCount,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // 0 = infinite
            pricing_scheme: {
              fixed_price: {
                value: plan.price.toString(),
                currency_code: plan.currency.toUpperCase(),
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: plan.currency.toUpperCase(),
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }),
    });
    if (!planResponse.ok) {
      const errorData = await planResponse.json();
      throw new BadRequestException(`Failed to create PayPal plan: ${errorData.message || 'Unknown error'}`);
    }
    const planData = await planResponse.json();
    const paypalPlanId = planData.id;
    // Create subscription
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `sub-${company._id}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
        subscriber: {
          email_address: company.email,
          name: {
            given_name: company.name.split(' ')[0] || company.name,
            surname: company.name.split(' ').slice(1).join(' ') || '',
          },
        },
        application_context: {
          brand_name: this.configService.get('APP_NAME') || 'Restaurant POS',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions?success=true&gateway=paypal`,
          cancel_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions?canceled=true&gateway=paypal`,
        },
      }),
    });
    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      throw new BadRequestException(`Failed to create PayPal subscription: ${errorData.message || 'Unknown error'}`);
    }
    const subscriptionData = await subscriptionResponse.json();
    const approvalUrl = subscriptionData.links?.find((link: any) => link.rel === 'approve')?.href;
    return {
      gateway: PaymentGateway.PAYPAL,
      sessionId: subscriptionData.id,
      url: approvalUrl,
      clientSecret: null,
      subscriptionId: subscriptionData.id,
    };
  }
  // Google Pay payment initialization
  private async initializeGooglePayPayment(company: CompanyDocument, plan: any, paymentMethod: SubscriptionPaymentMethodDocument) {
    // Google Pay can work through Stripe (recommended) or directly
    // For subscriptions, we'll use Stripe Checkout with Google Pay enabled
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Google Pay requires Stripe integration.');
    }
    // Create or get Stripe customer
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: { companyId: company._id.toString() },
      });
      customerId = customer.id;
      await this.companyModel.findByIdAndUpdate(company._id, {
        stripeCustomerId: customerId,
      });
    }
    // Create checkout session with Google Pay enabled
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'], // Google Pay is automatically available when enabled in Stripe Dashboard
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.displayName || plan.name,
              description: `Subscription for ${company.name}`,
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions/success?gateway=google_pay&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('APP_URL')}/dashboard/subscriptions?canceled=true&gateway=google_pay`,
      metadata: {
        companyId: company._id.toString(),
        planName: plan.name,
        gateway: 'google_pay',
      },
      // Enable Google Pay in checkout
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    });
    return {
      gateway: PaymentGateway.GOOGLE_PAY,
      sessionId: session.id,
      url: session.url,
      clientSecret: null,
    };
  }
  // bKash payment initialization
  private async initializeBkashPayment(
    company: CompanyDocument,
    plan: any,
    paymentMethod: SubscriptionPaymentMethodDocument,
    paymentDetails?: any,
  ) {
    const appKey = paymentMethod.config?.appKey || this.configService.get('bkash.appKey');
    const appSecret = paymentMethod.config?.appSecret || this.configService.get('bkash.appSecret');
    const username = paymentMethod.config?.username || this.configService.get('bkash.username');
    const password = paymentMethod.config?.password || this.configService.get('bkash.password');
    const isSandbox = paymentMethod.config?.isSandbox !== false; // Default to sandbox
    // Generate unique payment reference
    const paymentReference = `SUB-${company._id.toString().slice(-6)}-${Date.now()}`;
    const amount = plan.price.toString();
    // If bKash credentials are not configured, return manual payment flow
    if (!appKey || !appSecret || !username || !password) {
      return {
        gateway: PaymentGateway.BKASH,
        sessionId: null,
        url: null,
        clientSecret: null,
        instructions: {
          phoneNumber: paymentMethod.config?.accountNumber || '017XXXXXXXX',
          amount: plan.price,
          currency: plan.currency,
          reference: paymentReference,
          message: `Please send ${amount} ${plan.currency} to the bKash number above. Use reference: ${paymentReference}`,
        },
        requiresManualVerification: true,
        paymentReference,
      };
    }
    // bKash API integration
    const baseUrl = isSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    try {
      // Step 1: Get bKash token
      const tokenResponse = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': username,
          'password': password,
        },
        body: JSON.stringify({
          app_key: appKey,
          app_secret: appSecret,
        }),
      });
      if (!tokenResponse.ok) {
        throw new Error('Failed to get bKash token');
      }
      const tokenData = await tokenResponse.json();
      const idToken = tokenData.id_token;
      // Step 2: Create payment
      const paymentResponse = await fetch(`${baseUrl}/tokenized/checkout/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': appKey,
        },
        body: JSON.stringify({
          mode: '0011', // Checkout mode
          payerReference: company._id.toString(),
          callbackURL: `${this.configService.get('APP_URL')}/api/v1/subscription-payments/bkash/callback`,
          amount: amount,
          currency: plan.currency === 'BDT' ? 'BDT' : 'USD',
          intent: 'sale',
          merchantInvoiceNumber: paymentReference,
        }),
      });
      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(`bKash payment creation failed: ${errorData.errorMessage || 'Unknown error'}`);
      }
      const paymentData = await paymentResponse.json();
      const paymentId = paymentData.paymentID;
      const bkashUrl = paymentData.bkashURL;
      return {
        gateway: PaymentGateway.BKASH,
        sessionId: paymentId,
        url: bkashUrl,
        clientSecret: null,
        paymentReference,
        requiresManualVerification: false,
      };
    } catch (error: any) {
      // Fallback to manual payment if API fails
      return {
        gateway: PaymentGateway.BKASH,
        sessionId: null,
        url: null,
        clientSecret: null,
        instructions: {
          phoneNumber: paymentMethod.config?.accountNumber || '017XXXXXXXX',
          amount: plan.price,
          currency: plan.currency,
          reference: paymentReference,
          message: `Please send ${amount} ${plan.currency} to the bKash number above. Use reference: ${paymentReference}`,
          error: error.message,
        },
        requiresManualVerification: true,
        paymentReference,
      };
    }
  }
  // Nagad payment initialization
  private async initializeNagadPayment(
    company: CompanyDocument,
    plan: any,
    paymentMethod: SubscriptionPaymentMethodDocument,
    paymentDetails?: any,
  ) {
    const merchantId = paymentMethod.config?.merchantId || this.configService.get('nagad.merchantId');
    const publicKey = paymentMethod.config?.publicKey || this.configService.get('nagad.publicKey');
    const privateKey = paymentMethod.config?.privateKey || this.configService.get('nagad.privateKey');
    const isSandbox = paymentMethod.config?.isSandbox !== false; // Default to sandbox
    // Generate unique payment reference
    const paymentReference = `SUB-${company._id.toString().slice(-6)}-${Date.now()}`;
    const amount = plan.price.toString();
    // If Nagad credentials are not configured, return manual payment flow
    if (!merchantId || !publicKey || !privateKey) {
      return {
        gateway: PaymentGateway.NAGAD,
        sessionId: null,
        url: null,
        clientSecret: null,
        instructions: {
          phoneNumber: paymentMethod.config?.accountNumber || '019XXXXXXXX',
          amount: plan.price,
          currency: plan.currency,
          reference: paymentReference,
          message: `Please send ${amount} ${plan.currency} to the Nagad number above. Use reference: ${paymentReference}`,
        },
        requiresManualVerification: true,
        paymentReference,
      };
    }
    // Nagad API integration
    const baseUrl = isSandbox
      ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';
    try {
      // Step 1: Initialize payment
      const initResponse = await fetch(`${baseUrl}/check-out/initialize/${merchantId}/${paymentReference}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-KM-IP-V4': this.configService.get('APP_URL') || '127.0.0.1',
          'X-KM-Client-Type': 'PC_WEB',
          'X-KM-Api-Version': 'v-0.2.0',
        },
        body: JSON.stringify({
          accountNumber: paymentMethod.config?.accountNumber || merchantId,
          dateTime: new Date().toISOString(),
          challenge: paymentReference,
        }),
      });
      if (!initResponse.ok) {
        throw new Error('Failed to initialize Nagad payment');
      }
      const initData = await initResponse.json();
      // Step 2: Complete payment (this would typically be done after user confirms)
      // For now, we return the payment URL for user to complete
      const paymentUrl = `${baseUrl}/check-out/complete/${merchantId}/${paymentReference}`;
      return {
        gateway: PaymentGateway.NAGAD,
        sessionId: paymentReference,
        url: paymentUrl,
        clientSecret: null,
        paymentReference,
        requiresManualVerification: false,
        amount: amount,
        currency: plan.currency,
      };
    } catch (error: any) {
      // Fallback to manual payment if API fails
      return {
        gateway: PaymentGateway.NAGAD,
        sessionId: null,
        url: null,
        clientSecret: null,
        instructions: {
          phoneNumber: paymentMethod.config?.accountNumber || '019XXXXXXXX',
          amount: plan.price,
          currency: plan.currency,
          reference: paymentReference,
          message: `Please send ${amount} ${plan.currency} to the Nagad number above. Use reference: ${paymentReference}`,
          error: error.message,
        },
        requiresManualVerification: true,
        paymentReference,
      };
    }
  }
  // Manual payment initialization
  private async initializeManualPayment(
    company: CompanyDocument,
    plan: any,
    paymentMethod: SubscriptionPaymentMethodDocument,
  ) {
    // Check for account number in config - handle both nested and flat structures
    const accountNumber = 
      paymentMethod.config?.accountNumber || 
      (paymentMethod.config as any)?.account_number ||
      null;
    
    if (!accountNumber) {
      // Provide helpful error message with payment method details
      throw new BadRequestException(
        `Account number is not configured for this manual payment method (${paymentMethod.name}). ` +
        `Please update the payment method and add an account number in the Payment Gateway Credentials section.`
      );
    }

    // Generate unique payment reference
    const paymentReference = `SUB-${company._id.toString().slice(-6)}-${Date.now()}`;
    const amount = plan.price.toString();
    const currency = plan.currency || 'BDT';

    // Get payment instructions from config or use default
    const instructions = paymentMethod.config?.instructions || 
      `Please send ${amount} ${currency} to the account number above. Use reference: ${paymentReference}`;

    return {
      gateway: PaymentGateway.MANUAL,
      sessionId: null,
      url: null,
      clientSecret: null,
      instructions: {
        phoneNumber: accountNumber,
        amount: plan.price,
        currency: currency,
        reference: paymentReference,
        message: instructions,
      },
      requiresManualVerification: true,
      paymentReference,
    };
  }
  // Manual activation by super admin
  async manualActivation(dto: ManualActivationDto) {
    console.log('🟡 [ManualActivation] DTO received:', dto);
    const { companyId, planName, billingCycle, notes } = dto;

    const company = await this.companyModel.findById(companyId);
    if (!company) {
      console.error('🔴 [ManualActivation] Company NOT FOUND for id:', companyId);
      throw new NotFoundException('Company not found');
    }
    console.log('🟡 [ManualActivation] Company found:', {
      id: company._id?.toString?.() || companyId,
      name: company.name,
      subscriptionPlan: (company as any).subscriptionPlan,
      subscriptionStatus: (company as any).subscriptionStatus,
    });

    const plan = await this.subscriptionPlansService.findByName(planName);
    if (!plan) {
      console.error('🔴 [ManualActivation] Plan NOT FOUND for name:', planName);
      throw new NotFoundException('Subscription plan not found');
    }
    console.log('🟡 [ManualActivation] Plan found:', {
      id: (plan as any)._id?.toString?.(),
      name: plan.name,
      displayName: (plan as any).displayName,
      price: (plan as any).price,
      currency: (plan as any).currency,
      hasEnabledFeatureKeys: !!(plan as any).enabledFeatureKeys,
      enabledFeatureKeysCount: (plan as any).enabledFeatureKeys?.length || 0,
      hasLegacyFeatures: !!(plan as any).features,
    });

    const now = new Date();
    const cycle: BillingCycle =
      (billingCycle as BillingCycle) || BillingCycle.MONTHLY;
    const periodDays = getBillingCycleDays(cycle);
    const subscriptionEndDate = new Date(
      now.getTime() + periodDays * 24 * 60 * 60 * 1000,
    );

    console.log('🟡 [ManualActivation] Cycle & period:', {
      billingCycle: billingCycle || 'monthly',
      resolvedCycle: cycle,
      periodDays,
      subscriptionEndDate,
    });

    // --- Sync Subscription document so feature system sees correct plan/features ---
    // Resolve enabled feature keys from plan
    let enabledFeatures: string[] = [];
    if (
      (plan as any).enabledFeatureKeys &&
      Array.isArray((plan as any).enabledFeatureKeys) &&
      (plan as any).enabledFeatureKeys.length > 0
    ) {
      enabledFeatures = (plan as any).enabledFeatureKeys;
    } else if ((plan as any).features) {
      enabledFeatures = convertLegacyFeaturesToKeys(
        (plan as any).features || {},
      );
    }
    console.log('🟡 [ManualActivation] Resolved enabledFeatures:', {
      count: enabledFeatures.length,
      sample: enabledFeatures.slice(0, 10),
    });

    // Build simple limits object from plan (similar to SubscriptionsService)
    const maxBranches =
      (plan as any).limits?.maxBranches ??
      (plan as any).features?.maxBranches ??
      -1;
    const maxUsers =
      (plan as any).limits?.maxUsers ?? (plan as any).features?.maxUsers ?? -1;
    const derive = (value: number, multiplier: number) =>
      value > 0 ? value * multiplier : -1;

    const limits: any = {
      maxBranches,
      maxUsers,
      maxMenuItems:
        (plan as any).limits?.maxMenuItems ?? derive(maxUsers, 10),
      maxOrders: (plan as any).limits?.maxOrders ?? derive(maxUsers, 50),
      maxTables: (plan as any).limits?.maxTables ?? derive(maxBranches, 10),
      maxCustomers:
        (plan as any).limits?.maxCustomers ?? derive(maxUsers, 100),
      aiInsightsEnabled: !!(plan as any).features?.aiInsights,
      advancedReportsEnabled: !!(plan as any).features?.accounting,
      multiLocationEnabled: !!(plan as any).features?.multiBranch,
      apiAccessEnabled: !!(plan as any).features?.crm,
      whitelabelEnabled: !!(plan as any).limits?.whitelabelEnabled,
      customDomainEnabled: !!(plan as any).limits?.customDomainEnabled,
      prioritySupportEnabled:
        (plan as any).limits?.prioritySupportEnabled ??
        !!(plan as any).features?.aiInsights,
      storageGB: (plan as any).limits?.storageGB ?? 0,
      publicOrderingEnabled: !!(plan as any).limits?.publicOrderingEnabled,
      maxPublicBranches: (plan as any).limits?.maxPublicBranches ?? -1,
      reviewsEnabled: !!(plan as any).limits?.reviewsEnabled,
      reviewModerationRequired: !!(plan as any).limits?.reviewModerationRequired,
      maxReviewsPerMonth: (plan as any).limits?.maxReviewsPerMonth ?? -1,
    };

    console.log('🟡 [ManualActivation] Built limits from plan:', limits);

    // Find latest subscription for this company (if any)
    let subscription = await this.subscriptionModel
      .findOne({ companyId: company._id })
      .sort({ createdAt: -1 })
      .exec();

    if (subscription) {
      console.log('🟡 [ManualActivation] Existing subscription found:', {
        id: subscription._id?.toString?.(),
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
      });
      subscription.plan = plan.name as any;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.billingCycle = cycle;
      subscription.price = plan.price;
      subscription.currency = plan.currency || 'BDT';
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = subscriptionEndDate;
      subscription.nextBillingDate = subscriptionEndDate;
      subscription.lastPaymentDate = now;
      subscription.trialEndDate = null;
      subscription.enabledFeatures = enabledFeatures;
      subscription.limits = limits;
      subscription.isActive = true;
      await subscription.save();
      console.log('🟢 [ManualActivation] Updated subscription:', {
        id: subscription._id?.toString?.(),
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
        enabledFeaturesCount: subscription.enabledFeatures?.length || 0,
      });
    } else {
      // Create a fresh subscription record
      subscription = new this.subscriptionModel({
        companyId: company._id,
        plan: plan.name as any,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: cycle,
        price: plan.price,
        currency: plan.currency || 'BDT',
        currentPeriodStart: now,
        currentPeriodEnd: subscriptionEndDate,
        nextBillingDate: subscriptionEndDate,
        lastPaymentDate: now,
        trialEndDate: null,
        enabledFeatures,
        limits,
        usage: {
          currentBranches: 0,
          currentUsers: 0,
          currentMenuItems: 0,
          currentOrders: 0,
          currentTables: 0,
          currentCustomers: 0,
          storageUsed: 0,
          lastUpdated: now,
        },
        autoRenew: false,
        isActive: true,
      });
      await subscription.save();
      console.log('🟢 [ManualActivation] Created new subscription:', {
        id: subscription._id?.toString?.(),
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
        enabledFeaturesCount: subscription.enabledFeatures?.length || 0,
      });
    }

    // Update company subscription summary
    await this.companyModel.findByIdAndUpdate(companyId, {
      $set: {
        subscriptionPlan: plan.name,
        subscriptionStatus: 'active',
        subscriptionStartDate: now,
        subscriptionEndDate: subscriptionEndDate,
        nextBillingDate: subscriptionEndDate,
        settings: {
          ...company.settings,
          features: plan.features,
        },
      },
      $unset: {
        trialEndDate: '',
      },
    });
    return {
      success: true,
      message: 'Subscription activated successfully',
      company: {
        id: companyId,
        name: company.name,
        subscriptionPlan: plan.name,
        subscriptionStatus: 'active',
        subscriptionEndDate,
      },
      notes,
    };
  }
  // Verify payment (for manual payment methods)
  async verifyPayment(paymentId: string, transactionId: string) {
    // TODO: Implement payment verification
    // This would check with the payment gateway to verify the transaction
    return {
      verified: true,
      paymentId,
      transactionId,
    };
  }

  // Submit payment request (for manual payment methods like bKash/Nagad)
  async submitPaymentRequest(dto: SubmitPaymentRequestDto) {
    const company = await this.companyModel.findById(dto.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const paymentMethod = await this.paymentMethodModel.findById(dto.paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (!paymentMethod.isActive) {
      throw new BadRequestException('Payment method is not active');
    }

    // Check if there's already a pending request for this company and plan
    const existingRequest = await this.paymentRequestModel.findOne({
      companyId: dto.companyId,
      planName: dto.planName,
      status: PaymentRequestStatus.PENDING,
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending payment request for this plan');
    }

    const paymentRequest = new this.paymentRequestModel({
      companyId: dto.companyId,
      paymentMethodId: dto.paymentMethodId,
      planName: dto.planName,
      amount: dto.amount,
      currency: dto.currency || 'BDT',
      billingCycle: dto.billingCycle || 'monthly',
      transactionId: dto.transactionId,
      phoneNumber: dto.phoneNumber,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      screenshotUrl: dto.screenshotUrl,
      status: PaymentRequestStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const savedRequest = await paymentRequest.save();

    // Persist notification for company (owner/manager) so it appears in notifications list
    try {
      await this.notificationsService.create({
        companyId: dto.companyId,
        type: 'payment_request',
        title: 'Payment Request Submitted',
        message: `Your payment request for ${dto.planName} plan has been submitted. Our team will review and activate your subscription.`,
        metadata: {
          requestId: savedRequest._id.toString(),
          planName: dto.planName,
          amount: dto.amount,
          currency: dto.currency || 'BDT',
          billingCycle: dto.billingCycle || 'monthly',
          status: 'pending',
        },
        roles: [UserRole.OWNER, UserRole.MANAGER],
      });
    } catch (err) {
      console.warn(`Failed to create notification for payment request: ${err?.message || err}`);
    }

    const populatedRequest = await savedRequest.populate([
      { path: 'companyId', select: 'name email' },
      { path: 'paymentMethodId', select: 'name displayName gateway' },
    ]);

    // Notify all super admins about new payment request
    try {
      if (this.websocketsGateway && this.websocketsGateway.broadcastToRole) {
        this.websocketsGateway.broadcastToRole('super_admin', 'payment-request-created', {
          type: 'payment_request',
          title: 'New Payment Request',
          message: `${company.name} has submitted a payment request for ${dto.planName} plan (${dto.amount} ${dto.currency || 'BDT'})`,
          data: {
            requestId: savedRequest._id.toString(),
            companyId: company._id.toString(),
            companyName: company.name,
            planName: dto.planName,
            amount: dto.amount,
            currency: dto.currency || 'BDT',
            transactionId: dto.transactionId,
            phoneNumber: dto.phoneNumber,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ Error notifying super admins about payment request:', error);
    }

    // Notify company owner about submission
    try {
      if (this.websocketsGateway && typeof this.websocketsGateway.emitScopedNotification === 'function') {
        this.websocketsGateway.emitScopedNotification({
          companyId: company._id.toString(),
          roles: [UserRole.OWNER],
          payload: {
            type: 'payment_request',
            title: 'Payment Request Submitted',
            message: `Your payment request for ${dto.planName} plan has been submitted. Our team will review and activate your subscription within 24 hours.`,
            data: {
              requestId: savedRequest._id.toString(),
              planName: dto.planName,
              amount: dto.amount,
              currency: dto.currency || 'BDT',
              status: 'pending',
            },
            timestamp: new Date(),
          },
        });
        console.log('✅ Notification sent to company owner about payment request submission');
      } else {
        console.warn('⚠️ WebsocketsGateway.emitScopedNotification is not available');
      }
    } catch (error) {
      console.error('❌ Error notifying company owner:', error);
    }

    return populatedRequest;
  }

  // Get payment requests (for super admin)
  async getPaymentRequests(status?: PaymentRequestStatus, companyId?: string) {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (companyId) {
      query.companyId = companyId;
    }

    const requests = await this.paymentRequestModel
      .find(query)
      .populate('companyId', 'name email')
      .populate('paymentMethodId', 'name displayName gateway config')
      .populate('verifiedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();

    return requests;
  }

  // Get payment request by ID
  async getPaymentRequestById(id: string) {
    const request = await this.paymentRequestModel
      .findById(id)
      .populate('companyId', 'name email')
      .populate('paymentMethodId', 'name displayName gateway config')
      .populate('verifiedBy', 'firstName lastName email')
      .exec();

    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    return request;
  }

  // Verify payment request (for super admin)
  async verifyPaymentRequest(dto: VerifyPaymentRequestDto, adminId: string) {
    const request = await this.paymentRequestModel.findById(dto.requestId);
    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new BadRequestException(`Payment request is already ${request.status}`);
    }

    if (dto.status === PaymentRequestStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a payment request');
    }

    // Update request status
    request.status = dto.status;
    request.verifiedBy = adminId as any;
    request.verifiedAt = new Date();
    request.adminNotes = dto.adminNotes;
    if (dto.rejectionReason) {
      request.rejectionReason = dto.rejectionReason;
    }

    await request.save();
    
    // Get company ID as string before populating (to avoid issues with populated objects)
    let companyIdString: string;
    if (typeof request.companyId === 'object' && request.companyId !== null) {
      companyIdString = (request.companyId as any)._id?.toString() || (request.companyId as any).toString();
    } else {
      companyIdString = String(request.companyId);
    }

    const populatedRequest = await request.populate([
      { path: 'companyId', select: 'name email' },
      { path: 'paymentMethodId', select: 'name displayName gateway' },
      { path: 'verifiedBy', select: 'firstName lastName email' },
    ]);

    const company = typeof populatedRequest.companyId === 'object' ? populatedRequest.companyId : await this.companyModel.findById(companyIdString);

    // If verified, activate the subscription
    if (dto.status === PaymentRequestStatus.VERIFIED) {
      console.log('🟡 [VerifyPaymentRequest] About to call manualActivation with:', {
        companyId: companyIdString,
        planName: request.planName,
        billingCycle: request.billingCycle,
      });

      try {
        await this.manualActivation({
          companyId: companyIdString,
          planName: request.planName,
          billingCycle: request.billingCycle,
          notes: `Verified payment request. Transaction ID: ${request.transactionId}, Phone: ${request.phoneNumber}. ${dto.adminNotes || ''}`,
        });
        console.log('🟢 [VerifyPaymentRequest] manualActivation completed successfully');
      } catch (err) {
        console.error('🔴 [VerifyPaymentRequest] manualActivation FAILED:', err);
        throw err;
      }

      // Notify company owner about successful verification
      try {
        // Persist notification so it shows in notifications list
        await this.notificationsService.create({
          companyId: companyIdString,
          type: 'payment_request',
          title: 'Payment Verified & Subscription Activated',
          message: `Your payment request has been verified and your ${request.planName} subscription is now active!`,
          metadata: {
            requestId: request._id.toString(),
            planName: request.planName,
            amount: request.amount,
            currency: request.currency,
            status: 'verified',
          },
          roles: [UserRole.OWNER, UserRole.MANAGER],
        });
      } catch (error) {
        console.error('❌ Error creating notification for verification:', error);
      }
    } else if (dto.status === PaymentRequestStatus.REJECTED) {
      // Notify company owner about rejection
      try {
        if (this.websocketsGateway && typeof this.websocketsGateway.emitScopedNotification === 'function') {
          this.websocketsGateway.emitScopedNotification({
            companyId: companyIdString,
            roles: [UserRole.OWNER],
            payload: {
              type: 'payment_request',
              title: 'Payment Request Rejected',
              message: `Your payment request has been rejected. Reason: ${dto.rejectionReason || 'Please contact support for more information.'}`,
              data: {
                requestId: request._id.toString(),
                planName: request.planName,
                amount: request.amount,
                currency: request.currency,
                status: 'rejected',
                rejectionReason: dto.rejectionReason,
              },
              timestamp: new Date(),
            },
          });
          console.log('✅ Notification sent to company owner about rejection');
        } else {
          console.warn('⚠️ WebsocketsGateway.emitScopedNotification is not available');
        }
      } catch (error) {
        console.error('❌ Error notifying company owner about rejection:', error);
      }
    }

    return populatedRequest;
  }
  // PayPal webhook handler
  async handlePayPalWebhook(body: any, headers: any) {
    // Verify webhook signature (implement proper verification)
    const eventType = body.event_type;
    const resource = body.resource;
    // Handle different PayPal webhook events
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription activated - update company subscription
        if (resource?.id) {
          // Find company by subscription ID and activate
          // This would require storing PayPal subscription ID in company model
          // For now, log the event
          }
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // Subscription cancelled - update company subscription
        break;
      case 'PAYMENT.SALE.COMPLETED':
        // Payment completed
        break;
    }
    return { received: true };
  }
  // bKash callback handler
  async handleBkashCallback(body: any, query: any) {
    const { paymentID, status, transactionStatus } = body || query;
    if (!paymentID) {
      throw new BadRequestException('Payment ID is required');
    }
    // Verify payment status with bKash
    // This would require calling bKash API to verify the transaction
    // For now, return the status
    return {
      paymentID,
      status: status || transactionStatus,
      verified: status === 'success' || transactionStatus === 'Completed',
    };
  }
  // Nagad callback handler
  async handleNagadCallback(body: any, query: any) {
    const { paymentReferenceId, status, transactionStatus } = body || query;
    if (!paymentReferenceId) {
      throw new BadRequestException('Payment reference ID is required');
    }
    // Verify payment status with Nagad
    // This would require calling Nagad API to verify the transaction
    // For now, return the status
    return {
      paymentReferenceId,
      status: status || transactionStatus,
      verified: status === 'success' || transactionStatus === 'Completed',
    };
  }
}
