import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.REPORTS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDashboardStats(branchId, companyId);
  }


  @Get('dashboard/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get dashboard statistics for specific branch' })
  getDashboardStatsByBranch(
    @Param('branchId') branchId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDashboardStats(branchId, companyId);
  }

  @Get('sales/summary/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get sales summary report' })
  getSalesSummary(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesSummary(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales/revenue/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get revenue breakdown' })
  getRevenueBreakdown(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getRevenueBreakdown(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('orders/analytics/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get orders analytics' })
  getOrdersAnalytics(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getOrdersAnalytics(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }


  @Get('categories/performance/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get category performance' })
  getCategoryPerformance(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCategoryPerformance(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('customers/analytics/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get customer analytics' })
  getCustomerAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCustomerAnalytics(
      companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('peak-hours/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get peak hours analysis' })
  getPeakHours(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getPeakHours(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('inventory/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get inventory report' })
  getInventoryReport(@Param('companyId') companyId: string) {
    return this.reportsService.getInventoryReport(companyId);
  }

  @Get('comparison/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get comparison report (period vs period)' })
  getComparisonReport(
    @Param('branchId') branchId: string,
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
  ) {
    return this.reportsService.getComparisonReport(
      branchId,
      new Date(currentStart),
      new Date(currentEnd),
      new Date(previousStart),
      new Date(previousEnd),
    );
  }

  @Get('sales-analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get sales analytics for charts' })
  getSalesAnalytics(
    @Query('period') period: string = 'week',
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getSalesAnalytics(period, branchId);
  }


  @Get('top-selling-items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get top selling items' })
  getTopSellingItems(
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getTopSellingItems(limit || 10, branchId);
  }


  @Get('revenue-by-category')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get revenue by category' })
  getRevenueByCategorySimple(@Query('branchId') branchId?: string) {
    return this.reportsService.getRevenueByCategory(branchId);
  }


  @Get('low-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStockItems(@Query('companyId') companyId?: string) {
    return this.reportsService.getLowStockItems(companyId);
  }

  @Get('due-settlements')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get due settlements (pending payments)' })
  getDueSettlements(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDueSettlements(branchId, companyId);
  }

}

