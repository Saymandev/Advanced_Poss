import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class AiService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async generateSalesAnalytics(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    insights: string[];
    recommendations: string[];
    trends: {
      period: string;
      trend: 'up' | 'down' | 'stable';
      percentage: number;
    };
    topPerformingHours: string[];
    suggestions: string[];
  }> {
    // Get sales data for analysis
    const salesData = await this.orderModel.aggregate([
      {
        $match: {
          branchId: branchId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
          },
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get order type breakdown
    const orderTypeData = await this.orderModel.aggregate([
      {
        $match: {
          branchId: branchId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$orderType',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    // Get hourly performance
    const hourlyData = await this.orderModel.aggregate([
      {
        $match: {
          branchId: branchId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$completedAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 3 },
    ]);

    // Calculate trends
    const totalDays = salesData.length;
    const firstHalf = salesData.slice(0, Math.floor(totalDays / 2));
    const secondHalf = salesData.slice(Math.floor(totalDays / 2));

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.totalRevenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.totalRevenue, 0) / secondHalf.length;

    const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    const trend: 'up' | 'down' | 'stable' = 
      trendPercentage > 5 ? 'up' : 
      trendPercentage < -5 ? 'down' : 'stable';

    // Generate insights
    const insights = [];
    const recommendations = [];
    const suggestions = [];

    // Revenue insights
    const totalRevenue = salesData.reduce((sum, day) => sum + day.totalRevenue, 0);
    const avgDailyRevenue = totalRevenue / totalDays;
    
    if (avgDailyRevenue > 5000) {
      insights.push('Strong daily revenue performance with consistent sales');
    } else if (avgDailyRevenue > 2000) {
      insights.push('Moderate revenue performance with room for growth');
    } else {
      insights.push('Revenue performance needs improvement');
    }

    // Order type insights
    const dineInData = orderTypeData.find(item => item._id === 'dineIn');
    const deliveryData = orderTypeData.find(item => item._id === 'delivery');
    const takeawayData = orderTypeData.find(item => item._id === 'takeaway');

    if (dineInData && dineInData.count > 0) {
      const dineInPercentage = (dineInData.count / salesData.reduce((sum, day) => sum + day.totalOrders, 0)) * 100;
      if (dineInPercentage > 60) {
        insights.push('Dine-in orders dominate your business model');
        recommendations.push('Consider optimizing table turnover and service speed');
      }
    }

    if (deliveryData && deliveryData.count > 0) {
      const deliveryPercentage = (deliveryData.count / salesData.reduce((sum, day) => sum + day.totalOrders, 0)) * 100;
      if (deliveryPercentage > 40) {
        insights.push('Strong delivery performance indicates good online presence');
        recommendations.push('Focus on delivery time optimization and customer satisfaction');
      }
    }

    // Trend-based recommendations
    if (trend === 'up') {
      insights.push('Positive sales trend detected');
      recommendations.push('Maintain current strategies and consider expanding popular items');
    } else if (trend === 'down') {
      insights.push('Declining sales trend requires attention');
      recommendations.push('Review pricing strategy and consider promotional campaigns');
    }

    // Hourly performance insights
    const topHours = hourlyData.map(hour => `${hour._id}:00`);
    if (topHours.length > 0) {
      insights.push(`Peak performance hours: ${topHours.join(', ')}`);
      recommendations.push('Optimize staffing during peak hours');
    }

    // Generate suggestions
    suggestions.push('Consider implementing loyalty programs for repeat customers');
    suggestions.push('Analyze customer feedback to identify improvement areas');
    suggestions.push('Monitor inventory levels to prevent stockouts during peak hours');

    return {
      insights,
      recommendations,
      trends: {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        trend,
        percentage: Math.abs(trendPercentage),
      },
      topPerformingHours: topHours,
      suggestions,
    };
  }

  async generateOrderAnalytics(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    insights: string[];
    recommendations: string[];
    orderEfficiency: {
      avgPreparationTime: number;
      avgServiceTime: number;
      efficiencyScore: number;
    };
    customerSatisfaction: {
      estimatedScore: number;
      factors: string[];
    };
  }> {
    // Get order efficiency data
    const efficiencyData = await this.orderModel.aggregate([
      {
        $match: {
          branchId: branchId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          preparationTime: {
            $subtract: ['$completedAt', '$createdAt'],
          },
          orderValue: '$total',
          orderType: '$orderType',
        },
      },
      {
        $group: {
          _id: null,
          avgPreparationTime: { $avg: '$preparationTime' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$orderValue' },
        },
      },
    ]);

    const avgPreparationTimeMs = efficiencyData[0]?.avgPreparationTime || 0;
    const avgPreparationTimeMinutes = Math.round(avgPreparationTimeMs / (1000 * 60));

    // Calculate efficiency score (0-100)
    let efficiencyScore = 100;
    if (avgPreparationTimeMinutes > 30) efficiencyScore -= 20;
    if (avgPreparationTimeMinutes > 45) efficiencyScore -= 20;
    if (avgPreparationTimeMinutes > 60) efficiencyScore -= 30;

    // Generate insights
    const insights = [];
    const recommendations = [];

    if (avgPreparationTimeMinutes < 20) {
      insights.push('Excellent order preparation speed');
    } else if (avgPreparationTimeMinutes < 30) {
      insights.push('Good order preparation speed');
    } else {
      insights.push('Order preparation time needs improvement');
      recommendations.push('Review kitchen workflow and staff allocation');
    }

    if (efficiencyScore > 80) {
      insights.push('High operational efficiency');
    } else if (efficiencyScore > 60) {
      insights.push('Moderate operational efficiency');
    } else {
      insights.push('Operational efficiency needs attention');
      recommendations.push('Implement process improvements and staff training');
    }

    // Customer satisfaction estimation
    const satisfactionFactors = [];
    let estimatedScore = 75; // Base score

    if (avgPreparationTimeMinutes < 25) {
      estimatedScore += 10;
      satisfactionFactors.push('Fast service delivery');
    }

    if (efficiencyScore > 70) {
      estimatedScore += 10;
      satisfactionFactors.push('Efficient operations');
    }

    if (estimatedScore > 85) {
      satisfactionFactors.push('High customer satisfaction expected');
    } else if (estimatedScore < 70) {
      satisfactionFactors.push('Customer satisfaction may be impacted');
    }

    return {
      insights,
      recommendations,
      orderEfficiency: {
        avgPreparationTime: avgPreparationTimeMinutes,
        avgServiceTime: avgPreparationTimeMinutes + 5, // Estimated service time
        efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
      },
      customerSatisfaction: {
        estimatedScore: Math.max(0, Math.min(100, estimatedScore)),
        factors: satisfactionFactors,
      },
    };
  }

  // Placeholder methods for existing endpoints
  async predictSales(companyId: any, branchId?: any, daysAhead = 7): Promise<any> {
    return { message: 'Sales prediction feature coming soon' };
  }

  async recommendPricing(menuItemId: any): Promise<any> {
    return { message: 'Pricing recommendation feature coming soon' };
  }

  async analyzePeakHours(companyId: any, branchId?: any): Promise<any> {
    return { message: 'Peak hours analysis feature coming soon' };
  }

  async getCustomerRecommendations(customerId: any): Promise<any> {
    return { message: 'Customer recommendations feature coming soon' };
  }

  async analyzeMenuPerformance(companyId: any, branchId?: any): Promise<any> {
    return { message: 'Menu performance analysis feature coming soon' };
  }

  async generateBusinessInsights(companyId: any, branchId?: any, period = 'month'): Promise<any> {
    return { message: 'Business insights feature coming soon' };
  }
}