import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.REPORTS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDashboardStats(branchId, companyId);
  }


  @Get('dashboard/:branchId')

  @ApiOperation({ summary: 'Get dashboard statistics for specific branch' })
  getDashboardStatsByBranch(
    @Param('branchId') branchId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDashboardStats(branchId, companyId);
  }

  @Get('financial-summary')

  @ApiOperation({ summary: 'Get combined financial summary (sales, expenses, purchases, net)' })
  getFinancialSummary(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinancialSummary(branchId, companyId, startDate, endDate);
  }

  @Get('sales/summary/:branchId')

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
  @ApiOperation({ summary: 'Get customer analytics' })
  getCustomerAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getCustomerAnalytics(
      companyId,
      new Date(startDate),
      new Date(endDate),
      branchId,
    );
  }

  @Get('peak-hours/:branchId')

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
  @ApiOperation({ summary: 'Get inventory report' })
  getInventoryReport(
    @Param('companyId') companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getInventoryReport(companyId, branchId);
  }

  @Get('comparison/:branchId')

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

  @ApiOperation({ summary: 'Get sales analytics for charts' })
  getSalesAnalytics(
    @Query('period') period: string = 'week',
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesAnalytics(period, branchId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }


  @Get('top-selling-items')

  @ApiOperation({ summary: 'Get top selling items' })
  getTopSellingItems(
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getTopSellingItems(limit || 10, branchId);
  }


  @Get('revenue-by-category')

  @ApiOperation({ summary: 'Get revenue by category' })
  getRevenueByCategorySimple(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getRevenueByCategory(
      branchId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }


  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStockItems(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getLowStockItems(companyId, branchId);
  }

  @Get('due-settlements')

  @ApiOperation({ summary: 'Get due settlements (pending payments)' })
  getDueSettlements(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getDueSettlements(branchId, companyId);
  }

  @Get('wastage')

  @ApiOperation({ summary: 'Get wastage report' })
  getWastageReport(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getWastageReport(
      branchId,
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

