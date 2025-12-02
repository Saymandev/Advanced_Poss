import {
    BadRequestException,
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    RawBodyRequest,
    Req,
    UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCheckoutSessionDto, CreatePaymentIntentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe payment intent for subscription' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Company or plan not found' })
  async createPaymentIntent(@Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto.companyId,
      createPaymentIntentDto.planName,
    );
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Company or plan not found' })
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Validate and construct URLs - ensure they're valid URLs or use defaults
    let successUrl = createCheckoutSessionDto.successUrl;
    let cancelUrl = createCheckoutSessionDto.cancelUrl;
    
    // Validate URLs are properly formatted, fallback to defaults if invalid
    if (!successUrl || (!successUrl.startsWith('http://') && !successUrl.startsWith('https://'))) {
      successUrl = `${baseUrl}/payment/success`;
    }
    
    if (!cancelUrl || (!cancelUrl.startsWith('http://') && !cancelUrl.startsWith('https://'))) {
      cancelUrl = `${baseUrl}/payment/cancel`;
    }

    return this.paymentsService.createCheckoutSession(
      createCheckoutSessionDto.companyId,
      createCheckoutSessionDto.planName,
      successUrl,
      cancelUrl,
    );
  }

  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm payment and activate subscription' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmPayment(@Body('paymentIntentId') paymentIntentId: string) {
    return this.paymentsService.confirmPayment(paymentIntentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }

  @Post('activate-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually activate subscription from Stripe session ID (fallback for local dev)' })
  @ApiResponse({ status: 200, description: 'Subscription activated successfully' })
  @ApiResponse({ status: 400, description: 'Activation failed' })
  async activateSubscription(@Body('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }
    return this.paymentsService.activateSubscriptionFromSession(sessionId);
  }
}
