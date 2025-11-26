import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Schema as MongooseSchema } from 'mongoose';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { PaymentStatus } from './schemas/billing-history.schema';
import { SubscriptionPlan, SubscriptionStatus } from './schemas/subscription.schema';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Create a new subscription
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return await this.subscriptionsService.create(createSubscriptionDto);
  }

  // Get all subscriptions (Super Admin only)
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('plan') plan?: SubscriptionPlan,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.subscriptionsService.findAll({
      companyId: companyId
        ? (companyId as unknown as MongooseSchema.Types.ObjectId)
        : undefined,
      status,
      plan,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // Get current subscription for company
  @Get('current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getCurrent(@Query('companyId') companyId: string) {
    return await this.subscriptionsService.getCurrentSubscription(companyId);
  }

  // Get usage statistics for company
  @Get('usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getUsage(@Query('companyId') companyId: string) {
    return await this.subscriptionsService.getUsageStats(companyId);
  }

  // Get billing history for company
  @Get('billing-history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getCompanyBillingHistory(
    @Query('companyId') companyId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('status') status?: PaymentStatus,
  ) {
    const take = limit ? Number(limit) : 20;
    const currentPage = page ? Number(page) : 1;
    const offset = (currentPage - 1) * take;

    return await this.subscriptionsService.getBillingHistory(
      companyId,
      {
        status,
        limit: take,
        offset,
      },
    );
  }

  // Get subscription by ID
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string) {
    return await this.subscriptionsService.findById(id);
  }

  // Get subscription by company
  @Get('company/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findByCompany(@Param('companyId') companyId: string) {
    return await this.subscriptionsService.findByCompany(
      companyId as unknown as MongooseSchema.Types.ObjectId,
    );
  }

  // Update subscription
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto & { planId?: string },
  ) {
    if (updateSubscriptionDto?.planId) {
      return await this.subscriptionsService.updatePlanById(
        id,
        updateSubscriptionDto.planId,
        updateSubscriptionDto.billingCycle,
      );
    }

    return await this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  // Upgrade/Downgrade subscription
  @Patch(':id/upgrade')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async upgrade(
    @Param('id') id: string,
    @Body() upgradeDto: UpgradeSubscriptionDto,
  ) {
    return await this.subscriptionsService.upgrade(id, upgradeDto);
  }

  // Cancel subscription
  @Post(':id/cancel')
  @Patch(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    return await this.subscriptionsService.cancel(
      id,
      cancelDto.reason,
      cancelDto.cancelImmediately ??
        (cancelDto.cancelAtPeriodEnd !== undefined
          ? !cancelDto.cancelAtPeriodEnd
          : false),
    );
  }

  // Reactivate subscription
  @Post(':id/reactivate')
  @Patch(':id/reactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async reactivate(@Param('id') id: string) {
    return await this.subscriptionsService.reactivate(id);
  }

  // Pause subscription
  @Patch(':id/pause')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async pause(
    @Param('id') id: string,
    @Body('resumeDate') resumeDate?: Date,
  ) {
    return await this.subscriptionsService.pause(id, resumeDate);
  }

  // Resume subscription
  @Patch(':id/resume')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async resume(@Param('id') id: string) {
    return await this.subscriptionsService.resume(id);
  }

  // Process payment
  @Post(':id/payment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async processPayment(
    @Param('id') id: string,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    return await this.subscriptionsService.processPayment(
      id,
      processPaymentDto.paymentMethodId,
    );
  }

  // Check usage limit
  @Get(':companyId/limits/:limitType')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async checkLimit(
    @Param('companyId') companyId: string,
    @Param('limitType') limitType: string,
  ) {
    return await this.subscriptionsService.checkLimit(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      limitType as any,
    );
  }

  // Get billing history
  @Get('company/:companyId/billing-history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getBillingHistory(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: PaymentStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.subscriptionsService.getBillingHistory(companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // Get all subscription plans
  @Get('plans/list')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
  )
  async getPlans() {
    return await this.subscriptionsService.getPlans();
  }
}

