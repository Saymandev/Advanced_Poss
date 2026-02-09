import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateSubscriptionPaymentMethodDto } from './dto/create-subscription-payment-method.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { ManualActivationDto } from './dto/manual-activation.dto';
import { SubmitPaymentRequestDto } from './dto/submit-payment-request.dto';
import { UpdateSubscriptionPaymentMethodDto } from './dto/update-subscription-payment-method.dto';
import { VerifyPaymentRequestDto } from './dto/verify-payment-request.dto';
import { PaymentRequestStatus } from './schemas/subscription-payment-request.schema';
import { SubscriptionPaymentsService } from './subscription-payments.service';

@ApiTags('Subscription Payments')
@Controller('subscription-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.SETTINGS)
export class SubscriptionPaymentsController {
  constructor(private readonly paymentsService: SubscriptionPaymentsService) { }

  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods for subscriptions' })
  @ApiResponse({ status: 200, description: 'List of available payment methods' })
  async getPaymentMethods(
    @Query('country') country?: string,
    @Query('currency') currency?: string,
  ) {
    return this.paymentsService.getAvailablePaymentMethods(country, currency);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize subscription payment' })
  @ApiResponse({ status: 200, description: 'Payment initialized successfully' })
  async initializePayment(@Body() dto: CreateSubscriptionPaymentDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can initialize payments');
    }
    return this.paymentsService.initializePayment(dto);
  }

  @Post('manual-activation')
  @ApiOperation({ summary: 'Manually activate subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription activated successfully' })
  async manualActivation(
    @Body() dto: ManualActivationDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can manually activate subscriptions');
    }
    return this.paymentsService.manualActivation(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPayment(
    @Body() body: { paymentId: string; transactionId: string },
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can verify payments');
    }
    return this.paymentsService.verifyPayment(body.paymentId, body.transactionId);
  }

  // ========== Super Admin Payment Method Management ==========

  @Get('admin/methods')
  @ApiOperation({ summary: 'Get all payment methods (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all payment methods' })
  async getAllPaymentMethods(@CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can access all payment methods');
    }
    return this.paymentsService.getAllPaymentMethods();
  }

  @Get('admin/methods/:id')
  @ApiOperation({ summary: 'Get payment method by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method details' })
  async getPaymentMethodById(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can access payment method details');
    }
    return this.paymentsService.getPaymentMethodById(id);
  }

  @Post('admin/methods')
  @ApiOperation({ summary: 'Create a new payment method (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Payment method created successfully' })
  async createPaymentMethod(
    @Body() dto: CreateSubscriptionPaymentMethodDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can create payment methods');
    }
    return this.paymentsService.createPaymentMethod(dto);
  }

  @Put('admin/methods/:id')
  @ApiOperation({ summary: 'Update payment method (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPaymentMethodDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can update payment methods');
    }
    return this.paymentsService.updatePaymentMethod(id, dto);
  }

  @Delete('admin/methods/:id')
  @ApiOperation({ summary: 'Delete payment method (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  async deletePaymentMethod(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can delete payment methods');
    }
    return this.paymentsService.deletePaymentMethod(id);
  }

  @Patch('admin/methods/:id/toggle')
  @ApiOperation({ summary: 'Toggle payment method active status (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method status toggled successfully' })
  async togglePaymentMethodStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can toggle payment methods');
    }
    return this.paymentsService.togglePaymentMethodStatus(id);
  }

  // ========== Payment Webhooks/Callbacks ==========

  // ========== Payment Webhooks/Callbacks (Public endpoints) ==========

  @Public()
  @Post('paypal/webhook')
  @ApiOperation({ summary: 'PayPal webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePayPalWebhook(@Req() req: Request, @Body() body: any, @Headers() headers: any) {
    return this.paymentsService.handlePayPalWebhook(body, headers);
  }

  @Public()
  @Post('bkash/callback')
  @ApiOperation({ summary: 'bKash payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleBkashCallback(@Body() body: any, @Query() query: any) {
    return this.paymentsService.handleBkashCallback(body, query);
  }

  @Public()
  @Post('nagad/callback')
  @ApiOperation({ summary: 'Nagad payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleNagadCallback(@Body() body: any, @Query() query: any) {
    return this.paymentsService.handleNagadCallback(body, query);
  }

  // ========== Payment Requests (Manual Payment Methods) ==========

  @Post('requests')
  @ApiOperation({ summary: 'Submit payment request for manual payment methods' })
  @ApiResponse({ status: 201, description: 'Payment request submitted successfully' })
  async submitPaymentRequest(@Body() dto: SubmitPaymentRequestDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can submit payment requests');
    }
    return this.paymentsService.submitPaymentRequest(dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get payment requests (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of payment requests' })
  async getPaymentRequests(
    @Query('status') status?: PaymentRequestStatus,
    @Query('companyId') companyId?: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can view payment requests');
    }
    return this.paymentsService.getPaymentRequests(status, companyId);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get payment request by ID' })
  @ApiResponse({ status: 200, description: 'Payment request details' })
  async getPaymentRequestById(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can view payment requests');
    }
    return this.paymentsService.getPaymentRequestById(id);
  }

  @Post('requests/:id/verify')
  @ApiOperation({ summary: 'Verify payment request (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment request verified' })
  async verifyPaymentRequest(
    @Param('id') id: string,
    @Body() dto: Omit<VerifyPaymentRequestDto, 'requestId'>,
    @CurrentUser('id') adminId: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can verify payment requests');
    }
    return this.paymentsService.verifyPaymentRequest(
      { ...dto, requestId: id },
      adminId,
    );
  }
}

