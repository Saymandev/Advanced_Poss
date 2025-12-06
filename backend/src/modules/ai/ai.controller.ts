import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Schema as MongooseSchema } from 'mongoose';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Predict sales for upcoming days
  @Get('predict-sales')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async predictSales(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return await this.aiService.predictSales(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
      daysAhead ? Number(daysAhead) : 7,
    );
  }

  // Get pricing recommendations for a menu item
  @Get('pricing-recommendations/:menuItemId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async recommendPricing(@Param('menuItemId') menuItemId: string) {
    return await this.aiService.recommendPricing(
      menuItemId as unknown as MongooseSchema.Types.ObjectId,
    );
  }

  // Analyze peak hours and get staffing recommendations
  @Get('peak-hours')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async analyzePeakHours(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return await this.aiService.analyzePeakHours(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
    );
  }

  // Get personalized menu recommendations for a customer
  @Get('customer-recommendations/:customerId')
  @RequiresFeature(FEATURES.AI_CUSTOMER_LOYALTY)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  async getCustomerRecommendations(@Param('customerId') customerId: string) {
    return await this.aiService.getCustomerRecommendations(
      customerId as unknown as MongooseSchema.Types.ObjectId,
    );
  }

  // Analyze menu performance and get improvement suggestions
  @Get('menu-analysis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async analyzeMenuPerformance(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return await this.aiService.analyzeMenuPerformance(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
    );
  }

  // Generate comprehensive business insights
  @Get('business-insights')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async generateBusinessInsights(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('period') period?: 'week' | 'month' | 'quarter',
  ) {
    return await this.aiService.generateBusinessInsights(
      companyId as unknown as MongooseSchema.Types.ObjectId,
      branchId ? (branchId as unknown as MongooseSchema.Types.ObjectId) : undefined,
      period || 'month',
    );
  }

  // Generate AI-powered sales analytics
  @Get('sales-analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getSalesAnalytics(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.aiService.generateSalesAnalytics(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Generate AI-powered order analytics
  @Get('order-analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getOrderAnalytics(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.aiService.generateOrderAnalytics(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Get menu optimization suggestions
  @Get('menu-optimization')
  @RequiresFeature(FEATURES.AI_MENU_OPTIMIZATION)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getMenuOptimization(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getDemandPredictions(
    @Query('branchId') branchId?: string,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getPersonalizedOffers(
    @Body() body: { customerId: string; branchId: string },
  ) {
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

