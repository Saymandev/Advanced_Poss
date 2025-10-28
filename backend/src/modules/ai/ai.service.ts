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

  // Predict sales for the next N days
  async predictSales(companyId: any, branchId?: any, daysAhead = 7): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Use last 30 days for prediction

    const matchQuery: any = {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (branchId) {
      matchQuery.branchId = branchId;
    }

    // Get historical sales data
    const historicalData = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
          },
          dailyRevenue: { $sum: '$total' },
          dailyOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Simple linear regression for prediction
    const n = historicalData.length;
    if (n < 2) {
      return {
        predictions: [],
        confidence: 'low',
        message: 'Insufficient data for accurate prediction',
      };
    }

    // Calculate trend
    const sumX = (n * (n - 1)) / 2;
    const sumY = historicalData.reduce((sum, item) => sum + item.dailyRevenue, 0);
    const sumXY = historicalData.reduce((sum, item, index) => sum + (index * item.dailyRevenue), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions = [];
    const avgDailyRevenue = sumY / n;
    const variance = historicalData.reduce((sum, item) => sum + Math.pow(item.dailyRevenue - avgDailyRevenue, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    for (let i = 1; i <= daysAhead; i++) {
      const predictedRevenue = slope * (n + i - 1) + intercept;
      const confidence = Math.max(0, 1 - (standardDeviation / avgDailyRevenue));
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedRevenue: Math.max(0, predictedRevenue),
        confidence: Math.round(confidence * 100),
        range: {
          min: Math.max(0, predictedRevenue - standardDeviation),
          max: predictedRevenue + standardDeviation,
        },
      });
    }

    return {
      predictions,
      confidence: standardDeviation < avgDailyRevenue * 0.3 ? 'high' : 'medium',
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      averageDailyRevenue: avgDailyRevenue,
    };
  }

  // Recommend pricing for menu items
  async recommendPricing(menuItemId: any): Promise<any> {
    // Get sales data for this menu item
    const menuItemData = await this.orderModel.aggregate([
      {
        $unwind: '$items',
      },
      {
        $match: {
          'items.menuItemId': menuItemId,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$items.menuItemId',
          currentPrice: { $first: '$items.price' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]);

    if (menuItemData.length === 0) {
      return {
        message: 'No sales data found for this menu item',
        recommendations: [],
      };
    }

    const item = menuItemData[0];
    const currentPrice = item.currentPrice;
    const totalQuantity = item.totalQuantity;
    const totalRevenue = item.totalRevenue;
    const avgOrderValue = item.avgOrderValue;

    // Calculate price elasticity (simplified)
    const priceElasticity = -0.5; // Assumed elasticity
    const optimalPrice = currentPrice * (1 + (1 / Math.abs(priceElasticity)));

    // Generate recommendations
    const recommendations = [];

    if (totalQuantity < 10) {
      recommendations.push({
        type: 'price_reduction',
        suggestedPrice: currentPrice * 0.9,
        reason: 'Low sales volume - consider reducing price to increase demand',
        expectedImpact: 'Increase sales by 20-30%',
      });
    } else if (totalQuantity > 100 && currentPrice < avgOrderValue * 0.3) {
      recommendations.push({
        type: 'price_increase',
        suggestedPrice: currentPrice * 1.1,
        reason: 'High demand and low price relative to average order value',
        expectedImpact: 'Increase revenue by 10-15%',
      });
    }

    if (currentPrice > avgOrderValue * 0.5) {
      recommendations.push({
        type: 'premium_positioning',
        suggestedPrice: currentPrice,
        reason: 'Item is already positioned as premium - maintain current pricing',
        expectedImpact: 'Maintain current performance',
      });
    }

    return {
      currentPrice,
      totalQuantity,
      totalRevenue,
      recommendations,
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      priceElasticity,
    };
  }

  // Analyze peak hours
  async analyzePeakHours(companyId: any, branchId?: any): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const matchQuery: any = {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (branchId) {
      matchQuery.branchId = branchId;
    }

    const hourlyData = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $hour: '$completedAt' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Find peak hours
    const peakHours = hourlyData
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 3)
      .map(hour => ({
        hour: hour._id,
        timeRange: `${hour._id}:00 - ${hour._id + 1}:00`,
        orders: hour.totalOrders,
        revenue: hour.totalRevenue,
        avgOrderValue: hour.avgOrderValue,
      }));

    // Calculate busy periods
    const totalOrders = hourlyData.reduce((sum, hour) => sum + hour.totalOrders, 0);
    const busyThreshold = totalOrders * 0.1; // 10% of total orders

    const busyHours = hourlyData
      .filter(hour => hour.totalOrders >= busyThreshold)
      .map(hour => ({
        hour: hour._id,
        timeRange: `${hour._id}:00 - ${hour._id + 1}:00`,
        orders: hour.totalOrders,
        revenue: hour.totalRevenue,
        percentage: Math.round((hour.totalOrders / totalOrders) * 100),
      }));

    return {
      peakHours,
      busyHours,
      totalHoursAnalyzed: hourlyData.length,
      recommendations: [
        'Consider increasing staff during peak hours',
        'Optimize menu items for quick service during busy periods',
        'Implement dynamic pricing during peak hours',
      ],
    };
  }

  // Get customer recommendations
  async getCustomerRecommendations(customerId: any): Promise<any> {
    // Get customer's order history
    const customerOrders = await this.orderModel.find({
      'customerInfo.customerId': customerId,
      status: 'completed',
    }).sort({ completedAt: -1 }).limit(20);

    if (customerOrders.length === 0) {
      return {
        message: 'No order history found for this customer',
        recommendations: [],
      };
    }

    // Analyze customer preferences
    const itemFrequency = {};
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalSpent / customerOrders.length;

    customerOrders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.menuItemId.toString();
        if (!itemFrequency[itemId]) {
          itemFrequency[itemId] = {
            name: item.name,
            quantity: 0,
            totalSpent: 0,
          };
        }
        itemFrequency[itemId].quantity += item.quantity;
        itemFrequency[itemId].totalSpent += item.quantity * (item.basePrice + (item.selectedVariant?.priceModifier || 0) + (item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0));
      });
    });

    // Get most popular items across all customers
    const popularItems = await this.orderModel.aggregate([
      {
        $unwind: '$items',
      },
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
    ]);

    // Generate recommendations
    const recommendations = [];

    // Recommend items customer hasn't tried but are popular
    const customerItemIds = Object.keys(itemFrequency);
    const newItems = popularItems.filter(item => !customerItemIds.includes(item._id.toString()));

    if (newItems.length > 0) {
      recommendations.push({
        type: 'new_items',
        items: newItems.slice(0, 3).map(item => ({
          menuItemId: item._id,
          name: item.name,
          reason: 'Popular item you haven\'t tried yet',
        })),
      });
    }

    // Recommend similar items to what they order frequently
    const frequentItems = Object.values(itemFrequency)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 3);

    if (frequentItems.length > 0) {
      recommendations.push({
        type: 'similar_items',
        items: frequentItems.map((item: any) => ({
          name: item.name,
          reason: 'You order this frequently - you might like similar items',
        })),
      });
    }

    return {
      customerStats: {
        totalOrders: customerOrders.length,
        totalSpent,
        avgOrderValue,
        favoriteItems: Object.values(itemFrequency)
          .sort((a: any, b: any) => b.quantity - a.quantity)
          .slice(0, 5),
      },
      recommendations,
    };
  }

  // Analyze menu performance
  async analyzeMenuPerformance(companyId: any, branchId?: any): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const matchQuery: any = {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (branchId) {
      matchQuery.branchId = branchId;
    }

    const menuPerformance = await this.orderModel.aggregate([
      {
        $unwind: '$items',
      },
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          avgPrice: { $avg: '$items.price' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          revenuePerOrder: { $divide: ['$totalRevenue', '$orderCount'] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const totalRevenue = menuPerformance.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalQuantity = menuPerformance.reduce((sum, item) => sum + item.totalQuantity, 0);

    // Categorize items
    const topPerformers = menuPerformance.slice(0, 5);
    const underPerformers = menuPerformance
      .filter(item => item.totalRevenue < totalRevenue / menuPerformance.length)
      .slice(0, 5);

    // Calculate menu efficiency
    const menuEfficiency = menuPerformance.length > 0 ? 
      (topPerformers.reduce((sum, item) => sum + item.totalRevenue, 0) / totalRevenue) * 100 : 0;

    return {
      totalItems: menuPerformance.length,
      totalRevenue,
      totalQuantity,
      menuEfficiency: Math.round(menuEfficiency),
      topPerformers: topPerformers.map(item => ({
        ...item,
        revenuePercentage: Math.round((item.totalRevenue / totalRevenue) * 100),
      })),
      underPerformers: underPerformers.map(item => ({
        ...item,
        revenuePercentage: Math.round((item.totalRevenue / totalRevenue) * 100),
        recommendation: 'Consider promoting or removing this item',
      })),
      recommendations: [
        'Focus marketing on top-performing items',
        'Consider removing or repositioning underperforming items',
        'Analyze pricing strategy for low-revenue items',
      ],
    };
  }

  // Generate business insights
  async generateBusinessInsights(companyId: any, branchId?: any, period = 'month'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const matchQuery: any = {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (branchId) {
      matchQuery.branchId = branchId;
    }

    // Get comprehensive business data
    const [revenueData, orderData, customerData] = await Promise.all([
      this.orderModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
            maxOrderValue: { $max: '$total' },
            minOrderValue: { $min: '$total' },
          },
        },
      ]),
      this.orderModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            dailyOrders: { $sum: 1 },
            dailyRevenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.orderModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$customerInfo.customerId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
          },
        },
        {
          $group: {
            _id: null,
            uniqueCustomers: { $sum: 1 },
            avgOrdersPerCustomer: { $avg: '$totalOrders' },
            avgSpentPerCustomer: { $avg: '$totalSpent' },
          },
        },
      ]),
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, avgOrderValue: 0, maxOrderValue: 0, minOrderValue: 0 };
    const orders = orderData;
    const customers = customerData[0] || { uniqueCustomers: 0, avgOrdersPerCustomer: 0, avgSpentPerCustomer: 0 };

    // Calculate trends
    const revenueTrend = orders.length > 1 ? 
      ((orders[orders.length - 1].dailyRevenue - orders[0].dailyRevenue) / orders[0].dailyRevenue) * 100 : 0;

    const orderTrend = orders.length > 1 ? 
      ((orders[orders.length - 1].dailyOrders - orders[0].dailyOrders) / orders[0].dailyOrders) * 100 : 0;

    // Generate insights
    const insights = [];

    if (revenueTrend > 10) {
      insights.push({
        type: 'positive',
        message: `Revenue has increased by ${Math.round(revenueTrend)}% over the period`,
        impact: 'high',
      });
    } else if (revenueTrend < -10) {
      insights.push({
        type: 'negative',
        message: `Revenue has decreased by ${Math.round(Math.abs(revenueTrend))}% over the period`,
        impact: 'high',
      });
    }

    if (customers.avgOrdersPerCustomer > 3) {
      insights.push({
        type: 'positive',
        message: 'High customer loyalty - customers are returning frequently',
        impact: 'medium',
      });
    }

    if (revenue.avgOrderValue > revenue.maxOrderValue * 0.7) {
      insights.push({
        type: 'positive',
        message: 'Consistent high-value orders',
        impact: 'medium',
      });
    }

    return {
      period,
      summary: {
        totalRevenue: revenue.totalRevenue,
        totalOrders: orders.reduce((sum, order) => sum + order.dailyOrders, 0),
        uniqueCustomers: customers.uniqueCustomers,
        avgOrderValue: Math.round(revenue.avgOrderValue * 100) / 100,
        avgOrdersPerCustomer: Math.round(customers.avgOrdersPerCustomer * 100) / 100,
        avgSpentPerCustomer: Math.round(customers.avgSpentPerCustomer * 100) / 100,
      },
      trends: {
        revenue: Math.round(revenueTrend * 100) / 100,
        orders: Math.round(orderTrend * 100) / 100,
      },
      insights,
      recommendations: [
        'Monitor daily performance to identify patterns',
        'Focus on customer retention strategies',
        'Analyze peak performance days for optimization',
        'Consider seasonal adjustments based on trends',
      ],
    };
  }
}