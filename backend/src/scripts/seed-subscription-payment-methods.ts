import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import {
  PaymentGateway,
  PaymentMethodType,
  SubscriptionPaymentMethod,
} from '../modules/subscription-payments/schemas/subscription-payment-method.schema';
const defaultPaymentMethods = [
  // Worldwide payment methods
  {
    gateway: PaymentGateway.STRIPE,
    type: PaymentMethodType.CARD,
    name: 'Credit/Debit Card',
    code: 'stripe_card',
    displayName: 'Credit or Debit Card',
    description: 'Pay with Visa, Mastercard, American Express, or other cards',
    icon: 'credit-card',
    isActive: true,
    isDefault: true, // Stripe is the default payment method
    supportedCountries: [], // Worldwide
    supportedCurrencies: [], // All currencies
    sortOrder: 1,
  },
  {
    gateway: PaymentGateway.PAYPAL,
    type: PaymentMethodType.DIGITAL_WALLET,
    name: 'PayPal',
    code: 'paypal',
    displayName: 'PayPal',
    description: 'Pay securely with your PayPal account',
    icon: 'paypal',
    isActive: true,
    supportedCountries: [], // Worldwide
    supportedCurrencies: [], // All currencies
    sortOrder: 2,
  },
  {
    gateway: PaymentGateway.GOOGLE_PAY,
    type: PaymentMethodType.DIGITAL_WALLET,
    name: 'Google Pay',
    code: 'google_pay',
    displayName: 'Google Pay',
    description: 'Pay quickly with Google Pay',
    icon: 'google-pay',
    isActive: true,
    supportedCountries: [], // Worldwide
    supportedCurrencies: [], // All currencies
    sortOrder: 3,
  },
  {
    gateway: PaymentGateway.APPLE_PAY,
    type: PaymentMethodType.DIGITAL_WALLET,
    name: 'Apple Pay',
    code: 'apple_pay',
    displayName: 'Apple Pay',
    description: 'Pay securely with Apple Pay',
    icon: 'apple-pay',
    isActive: true,
    supportedCountries: [], // Worldwide
    supportedCurrencies: [], // All currencies
    sortOrder: 4,
  },
  // Bangladesh-specific payment methods
  {
    gateway: PaymentGateway.BKASH,
    type: PaymentMethodType.MOBILE_WALLET,
    name: 'bKash',
    code: 'bkash',
    displayName: 'bKash',
    description: 'Pay with bKash mobile wallet',
    icon: 'bkash',
    isActive: true,
    supportedCountries: ['BD'], // Bangladesh only
    supportedCurrencies: ['BDT'],
    sortOrder: 10,
    metadata: {
      minAmount: 10,
      maxAmount: 50000,
    },
  },
  {
    gateway: PaymentGateway.NAGAD,
    type: PaymentMethodType.MOBILE_WALLET,
    name: 'Nagad',
    code: 'nagad',
    displayName: 'Nagad',
    description: 'Pay with Nagad mobile wallet',
    icon: 'nagad',
    isActive: true,
    supportedCountries: ['BD'], // Bangladesh only
    supportedCurrencies: ['BDT'],
    sortOrder: 11,
    metadata: {
      minAmount: 10,
      maxAmount: 50000,
    },
  },
  {
    gateway: PaymentGateway.ROCKET,
    type: PaymentMethodType.MOBILE_WALLET,
    name: 'Rocket',
    code: 'rocket',
    displayName: 'Rocket (DBBL)',
    description: 'Pay with Rocket mobile wallet',
    icon: 'rocket',
    isActive: true,
    supportedCountries: ['BD'], // Bangladesh only
    supportedCurrencies: ['BDT'],
    sortOrder: 12,
    metadata: {
      minAmount: 10,
      maxAmount: 50000,
    },
  },
  {
    gateway: PaymentGateway.UPAY,
    type: PaymentMethodType.MOBILE_WALLET,
    name: 'Upay',
    code: 'upay',
    displayName: 'Upay',
    description: 'Pay with Upay mobile wallet',
    icon: 'upay',
    isActive: true,
    supportedCountries: ['BD'], // Bangladesh only
    supportedCurrencies: ['BDT'],
    sortOrder: 13,
    metadata: {
      minAmount: 10,
      maxAmount: 50000,
    },
  },
];
async function seedPaymentMethods() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentMethodModel = app.get<Model<SubscriptionPaymentMethod>>(
    getModelToken(SubscriptionPaymentMethod.name),
  );
  for (const method of defaultPaymentMethods) {
    const existing = await paymentMethodModel.findOne({ code: method.code });
    if (existing) {
      
      continue;
    }
    await paymentMethodModel.create(method);
    }
  await app.close();
}
seedPaymentMethods().catch((error) => {
  console.error('❌ Error seeding payment methods:', error);
  process.exit(1);
});
