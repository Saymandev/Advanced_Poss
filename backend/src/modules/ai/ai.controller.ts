import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { Schema as MongooseSchema } from 'mongoose';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
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
}

