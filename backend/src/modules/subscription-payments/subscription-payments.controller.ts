import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSubscriptionPaymentMethodDto } from './dto/create-subscription-payment-method.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { ManualActivationDto } from './dto/manual-activation.dto';
import { UpdateSubscriptionPaymentMethodDto } from './dto/update-subscription-payment-method.dto';
import { SubscriptionPaymentsService } from './subscription-payments.service';

@ApiTags('Subscription Payments')
@Controller('subscription-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionPaymentsController {
  constructor(private readonly paymentsService: SubscriptionPaymentsService) {}

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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async initializePayment(@Body() dto: CreateSubscriptionPaymentDto) {
    return this.paymentsService.initializePayment(dto);
  }

  @Post('manual-activation')
  @ApiOperation({ summary: 'Manually activate subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription activated successfully' })
  @Roles(UserRole.SUPER_ADMIN)
  async manualActivation(
    @Body() dto: ManualActivationDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.manualActivation(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async verifyPayment(
    @Body() body: { paymentId: string; transactionId: string },
  ) {
    return this.paymentsService.verifyPayment(body.paymentId, body.transactionId);
  }

  // ========== Super Admin Payment Method Management ==========

  @Get('admin/methods')
  @ApiOperation({ summary: 'Get all payment methods (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all payment methods' })
  @Roles(UserRole.SUPER_ADMIN)
  async getAllPaymentMethods() {
    return this.paymentsService.getAllPaymentMethods();
  }

  @Get('admin/methods/:id')
  @ApiOperation({ summary: 'Get payment method by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method details' })
  @Roles(UserRole.SUPER_ADMIN)
  async getPaymentMethodById(@Param('id') id: string) {
    return this.paymentsService.getPaymentMethodById(id);
  }

  @Post('admin/methods')
  @ApiOperation({ summary: 'Create a new payment method (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Payment method created successfully' })
  @Roles(UserRole.SUPER_ADMIN)
  async createPaymentMethod(
    @Body() dto: CreateSubscriptionPaymentMethodDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.createPaymentMethod(dto);
  }

  @Put('admin/methods/:id')
  @ApiOperation({ summary: 'Update payment method (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  @Roles(UserRole.SUPER_ADMIN)
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPaymentMethodDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.updatePaymentMethod(id, dto);
  }

  @Delete('admin/methods/:id')
  @ApiOperation({ summary: 'Delete payment method (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  @Roles(UserRole.SUPER_ADMIN)
  async deletePaymentMethod(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.deletePaymentMethod(id);
  }

  @Patch('admin/methods/:id/toggle')
  @ApiOperation({ summary: 'Toggle payment method active status (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment method status toggled successfully' })
  @Roles(UserRole.SUPER_ADMIN)
  async togglePaymentMethodStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
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
}

