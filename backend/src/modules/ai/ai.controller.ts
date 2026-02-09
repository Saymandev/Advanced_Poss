import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Schema as MongooseSchema } from 'mongoose';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.AI_INSIGHTS)
export class AiController {
  constructor(private readonly aiService: AiService) { }

  // Predict sales for upcoming days
  @Get('predict-sales')
  async predictSales(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('daysAhead') daysAhead?: number,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can predict sales');
    }
    return await this.aiService.predictSales(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
      daysAhead ? Number(daysAhead) : 7,
    );
  }

  // Get pricing recommendations for a menu item
  @Get('pricing-recommendations/:menuItemId')
  async recommendPricing(@Param('menuItemId') menuItemId: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can view pricing recommendations');
    }
    return await this.aiService.recommendPricing(
      menuItemId as unknown as MongooseSchema.Types.ObjectId,
    );
  }

  // Analyze peak hours and get staffing recommendations
  @Get('peak-hours')
  async analyzePeakHours(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can analyze peak hours');
    }
    return await this.aiService.analyzePeakHours(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
    );
  }

  // Get personalized menu recommendations for a customer
  @Get('customer-recommendations/:customerId')
  @RequiresFeature(FEATURES.AI_CUSTOMER_LOYALTY)
  async getCustomerRecommendations(@Param('customerId') customerId: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.WAITER && user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Waiters, Managers and Owners can view customer recommendations');
    }
    return await this.aiService.getCustomerRecommendations(
      customerId as unknown as MongooseSchema.Types.ObjectId,
    );
  }

  // Analyze menu performance and get improvement suggestions
  @Get('menu-analysis')
  async analyzeMenuPerformance(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can analyze menu performance');
    }
    return await this.aiService.analyzeMenuPerformance(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
    );
  }

  // Generate comprehensive business insights
  @Get('business-insights')
  async generateBusinessInsights(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('period') period?: 'week' | 'month' | 'quarter',
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can generate business insights');
    }
    return await this.aiService.generateBusinessInsights(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
      period || 'month',
    );
  }

  // Generate AI-powered sales analytics
  @Get('sales-analytics')
  async getSalesAnalytics(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can view sales analytics');
    }
    return this.aiService.generateSalesAnalytics(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Generate AI-powered order analytics
  @Get('order-analytics')
  async getOrderAnalytics(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can view order analytics');
    }
    return this.aiService.generateOrderAnalytics(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Get menu optimization suggestions
  @Get('menu-optimization')
  @RequiresFeature(FEATURES.AI_MENU_OPTIMIZATION)
  async getMenuOptimization(
    @Query('branchId') branchId: string,
    @Query('category') category: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can view menu optimization');
    }
    if (!branchId) {
      throw new BadRequestException('Branch ID is required');
    }
    const suggestions = await this.aiService.getMenuOptimization(
      branchId,
      category,
    );
    return {
      success: true,
      data: suggestions,
      count: suggestions.length,
    };
  }

  // Get demand predictions
  @Get('demand-predictions')
  async getDemandPredictions(
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can view demand predictions');
    }
    if (!branchId) {
      throw new BadRequestException('Branch ID is required');
    }
    const predictions = await this.aiService.getDemandPredictions(branchId);
    return {
      success: true,
      data: predictions,
      count: predictions.length,
    };
  }

  // Generate personalized offers for a customer
  @Post('personalized-offers')
  @RequiresFeature(FEATURES.AI_CUSTOMER_LOYALTY)
  async getPersonalizedOffers(
    @Body() body: { customerId: string; branchId: string },
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can generate personalized offers');
    }
    if (!body.customerId) {
      throw new BadRequestException('Customer ID is required');
    }
    if (!body.branchId) {
      throw new BadRequestException('Branch ID is required');
    }
    const offers = await this.aiService.generatePersonalizedOffers(
      body.customerId,
      body.branchId,
    );
    return {
      success: true,
      offers,
      count: offers.length,
    };
  }
}

