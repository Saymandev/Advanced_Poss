import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OpenAIService } from '../../common/services/openai.service';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private openAIService: OpenAIService,
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
  // Get menu optimization suggestions
  async getMenuOptimization(branchId: string, category?: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID');
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Last 90 days
    // Build menu items query - match menu-items service logic
    // Include both branch-specific items and company-wide items (branchId: null)
    const branchIdObj = new Types.ObjectId(branchId);

    let menuItems = await this.menuItemModel.find({
      $or: [
        { branchId: branchIdObj },
        { branchId: branchId }, // Try string format too
        { branchId: null }, // Include company-wide items
      ],
    })
      .populate('categoryId', 'name type')
      .lean();

    // Filter out unavailable items
    menuItems = menuItems.filter((item: any) => item.isAvailable !== false);
    // Filter by category name if provided
    if (category && category !== 'all') {
      menuItems = menuItems.filter((item: any) => {
        const populatedCategory = item.categoryId;
        if (!populatedCategory) return false;
        // Handle both populated ObjectId with name property and direct name access
        const categoryName = populatedCategory.name || populatedCategory;
        return categoryName && categoryName.toString().toLowerCase() === category.toLowerCase();
      });
    }
    // If there are no menu items, return empty array
    // Note: We'll generate suggestions for ALL menu items, even without sales data
    if (menuItems.length === 0) {
      return [];
    }
    // Get order data for these menu items - Use POSOrder for actual sales data
    // Note: This will be empty if there are no sales yet, but we'll still generate suggestions
    const menuItemIds = menuItems.map(item => item._id);
    const orderData = await this.posOrderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          status: 'paid', // POSOrder uses 'paid' status
          createdAt: { $gte: startDate, $lte: endDate }, // Use createdAt for POSOrder
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.menuItemId': { $in: menuItemIds },
        },
      },
      {
        $group: {
          _id: '$items.menuItemId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          avgPrice: { $avg: '$items.price' },
          orderCount: { $sum: 1 },
          lastOrderDate: { $max: '$createdAt' }, // Use createdAt for POSOrder
        },
      },
    ]);
    // Create a map of order data by menu item ID
    const orderDataMap = new Map();
    orderData.forEach(item => {
      orderDataMap.set(item._id.toString(), item);
    });
    // Calculate total revenue for comparison (not used in current logic but useful for future enhancements)
    const totalBranchRevenue = orderData.reduce((sum, item) => sum + item.totalRevenue, 0);
    // Generate optimization suggestions for ALL menu items
    const suggestions = [];
    for (const menuItem of menuItems) {
      const itemId = menuItem._id.toString();
      const itemOrderData = orderDataMap.get(itemId);
      const currentPrice = menuItem.price || 0;
      const totalQuantity = itemOrderData?.totalQuantity || 0;
      const totalRevenue = itemOrderData?.totalRevenue || 0;
      const orderCount = itemOrderData?.orderCount || 0;
      const avgPrice = itemOrderData?.avgPrice || currentPrice;
      // Calculate metrics
      const daysSinceLastOrder = itemOrderData?.lastOrderDate 
        ? Math.floor((endDate.getTime() - new Date(itemOrderData.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never ordered
      // Calculate demand score (0-10)
      const demandScore = Math.min(10, Math.max(0, 
        (totalQuantity / 10) + // Base on quantity
        (orderCount / 5) + // Base on order frequency
        (daysSinceLastOrder < 7 ? 3 : daysSinceLastOrder < 30 ? 1 : -2) // Recency bonus
      ));
      // Calculate popularity score (0-5)
      const popularityScore = Math.min(5, Math.max(0,
        (totalQuantity / 20) + // Base on total quantity
        (orderCount / 10) // Base on order count
      ));
      // Calculate profit margin (simplified - assuming 30% cost)
      const estimatedCost = currentPrice * 0.3;
      const profitMargin = currentPrice > 0 ? ((currentPrice - estimatedCost) / currentPrice) * 100 : 0;
      // Determine recommendation - Try OpenAI first, fallback to rule-based
      let recommendation: 'increase_price' | 'decrease_price' | 'maintain_price' | 'remove_item' | 'add_item' = 'maintain_price';
      let suggestedPrice = currentPrice;
      let priceChange = 0;
      let reasoning = '';
      let confidence = 0.5;
      let expectedImpactFromAI: { revenue: number; profit: number; orders: number } | null = null;
      // Try to get AI-powered recommendation if OpenAI is available
      if (this.openAIService.isAvailable()) {
        try {
          const categoryName = (menuItem.categoryId as any)?.name || menuItem.categoryId;
          // Get sales trend data
          const sales30Days = orderData.filter((o: any) => {
            const orderDate = new Date(o.lastOrderDate || 0);
            const daysDiff = Math.floor((endDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 30;
          }).reduce((sum: number, o: any) => sum + (o.totalQuantity || 0), 0);
          const sales90Days = totalQuantity;
          const avgDailySales = totalQuantity > 0 ? totalQuantity / 90 : 0;
          let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
          if (sales30Days > 0 && sales90Days > 0) {
            const avg30Days = sales30Days / 30;
            const avg90Days = sales90Days / 90;
            if (avg30Days > avg90Days * 1.2) trend = 'increasing';
            else if (avg30Days < avg90Days * 0.8) trend = 'decreasing';
          }
          const aiRecommendation = await this.openAIService.generateMenuOptimizationRecommendation({
            itemName: menuItem.name || 'Unknown Item',
            currentPrice,
            demandScore,
            popularityScore,
            profitMargin,
            totalQuantity,
            orderCount,
            daysSinceLastOrder,
            avgPrice,
            category: typeof categoryName === 'string' ? categoryName : undefined,
            salesData: {
              last30Days: sales30Days,
              last90Days: sales90Days,
              trend,
            },
          });
          if (aiRecommendation) {
            this.logger.log(`✅ Using AI recommendation for ${menuItem.name}`);
            recommendation = aiRecommendation.recommendation;
            suggestedPrice = Math.round(aiRecommendation.suggestedPrice * 100) / 100;
            priceChange = suggestedPrice !== currentPrice 
              ? Math.round(((suggestedPrice - currentPrice) / currentPrice) * 100 * 10) / 10
              : 0;
            reasoning = aiRecommendation.reasoning;
            confidence = aiRecommendation.confidence;
            expectedImpactFromAI = aiRecommendation.expectedImpact;
          } else {
            this.logger.warn(`⚠️ AI recommendation failed for ${menuItem.name}, using rule-based`);
          }
        } catch (error) {
          this.logger.error(`Error getting AI recommendation for ${menuItem.name}: ${error.message}`);
          // Continue with rule-based logic
        }
      }
      // Fallback to rule-based recommendations if AI is not available or failed
      if (!expectedImpactFromAI) {
        // Handle items with no sales differently - provide useful initial recommendations
        if (totalQuantity === 0) {
          // New items or items with no sales - suggest promotional pricing to boost visibility
          recommendation = 'decrease_price';
          suggestedPrice = Math.round(currentPrice * 0.9 * 100) / 100; // 10% discount
          priceChange = -10;
          reasoning = 'New item with no sales data yet. Consider promotional pricing (10% discount) to increase visibility and attract initial customers. Monitor performance after first week.';
          confidence = 0.55;
        } else if (daysSinceLastOrder > 60) {
          recommendation = 'remove_item';
          reasoning = 'No sales in the last 60+ days. Consider removing this item from the menu or reintroducing it with promotional pricing.';
          confidence = 0.8;
        } else if (demandScore > 7 && currentPrice < avgPrice * 0.9) {
          recommendation = 'increase_price';
          suggestedPrice = Math.round(currentPrice * 1.1 * 100) / 100;
          priceChange = 10;
          reasoning = `High demand (${demandScore.toFixed(1)}/10) but price is below average. Increasing price by 10% could boost revenue without significantly impacting demand.`;
          confidence = 0.75;
        } else if (demandScore < 3 && currentPrice > avgPrice * 1.1) {
          recommendation = 'decrease_price';
          suggestedPrice = Math.round(currentPrice * 0.9 * 100) / 100;
          priceChange = -10;
          reasoning = `Low demand (${demandScore.toFixed(1)}/10) and price is above average. Reducing price by 10% could increase demand and overall revenue.`;
          confidence = 0.7;
        } else if (demandScore > 5 && profitMargin < 20) {
          recommendation = 'increase_price';
          suggestedPrice = Math.round(currentPrice * 1.05 * 100) / 100;
          priceChange = 5;
          reasoning = `Good demand but low profit margin (${profitMargin.toFixed(1)}%). Small price increase could improve profitability.`;
          confidence = 0.65;
        } else {
          recommendation = 'maintain_price';
          reasoning = `Current pricing appears optimal based on demand (${demandScore.toFixed(1)}/10) and performance metrics.`;
          confidence = 0.6;
        }
      }
      // Calculate expected impact - use AI prediction if available, otherwise calculate
      let expectedRevenueChange = 0;
      let expectedOrderChange = 0;
      if (expectedImpactFromAI) {
        // Use AI-provided impact
        expectedRevenueChange = expectedImpactFromAI.revenue;
        expectedOrderChange = expectedImpactFromAI.orders;
      } else {
        // Fallback to rule-based calculation
        if (totalQuantity > 0) {
          // Items with sales: calculate based on actual volume
          expectedRevenueChange = (suggestedPrice - currentPrice) * totalQuantity * 0.8; // Assume 80% of current volume
          expectedOrderChange = priceChange > 0 ? -Math.round(totalQuantity * 0.1) : priceChange < 0 ? Math.round(totalQuantity * 0.2) : 0;
        } else if (priceChange !== 0) {
          // Items with no sales but price change: estimate potential
          const estimatedMonthlyQuantity = 5; // Estimate 5 units/month for new items
          expectedRevenueChange = (suggestedPrice - currentPrice) * estimatedMonthlyQuantity;
          expectedOrderChange = priceChange < 0 ? 3 : 0; // Promotional pricing might attract 3 more orders
        }
      }
      const expectedProfitChange = expectedImpactFromAI?.profit || (expectedRevenueChange * (profitMargin / 100));
      suggestions.push({
        id: itemId,
        itemId: itemId,
        itemName: menuItem.name || 'Unknown Item',
        currentPrice,
        suggestedPrice,
        priceChange,
        demandScore: Math.round(demandScore * 10) / 10,
        popularityScore: Math.round(popularityScore * 10) / 10,
        profitMargin: Math.round(profitMargin * 10) / 10,
        recommendation,
        reasoning,
        confidence: Math.round(confidence * 100) / 100,
        expectedImpact: {
          revenue: Math.round(expectedRevenueChange * 100) / 100,
          profit: Math.round(expectedProfitChange * 100) / 100,
          orders: expectedOrderChange,
        },
        createdAt: new Date().toISOString(),
      });
    }
    // Sort by expected revenue impact (descending)
    const sortedSuggestions = suggestions.sort((a, b) => b.expectedImpact.revenue - a.expectedImpact.revenue);
    return sortedSuggestions;
  }
  // Get demand predictions
  async getDemandPredictions(branchId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID');
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    // Get menu items - match the same logic as menu-items service
    const branchIdObj = new Types.ObjectId(branchId);
    let menuItems = await this.menuItemModel.find({
      $or: [
        { branchId: branchIdObj },
        { branchId: branchId }, // Try string format too
        { branchId: null }, // Include company-wide items
      ],
    })
      .populate('categoryId', 'name type')
      .lean();
    // Filter out unavailable items
    menuItems = menuItems.filter((item: any) => item.isAvailable !== false);
    if (menuItems.length === 0) {
      return [];
    }
    const menuItemIds = menuItems.map(item => item._id);
    // Get historical order data - Use POSOrder for actual sales data
    // Try both string and ObjectId formats for branchId
    const orderData = await this.posOrderModel.aggregate([
      {
        $match: {
          $or: [
            { branchId: new Types.ObjectId(branchId) },
            { branchId: branchId }
          ],
          status: 'paid', // POSOrder uses 'paid' status
          createdAt: { $gte: startDate, $lte: endDate }, // Use createdAt for POSOrder
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.menuItemId': { $in: menuItemIds },
        },
      },
      {
        $group: {
          _id: {
            menuItemId: '$items.menuItemId',
            dayOfWeek: { $dayOfWeek: '$createdAt' }, // Use createdAt for POSOrder
            hour: { $hour: '$createdAt' }, // Use createdAt for POSOrder
          },
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);
    // Calculate predictions for each menu item
    const predictions = [];
    for (const menuItem of menuItems) {
      const itemId = menuItem._id.toString();
      const itemOrders = orderData.filter(o => o._id.menuItemId.toString() === itemId);
      // Generate predictions even for items with no sales data
      if (itemOrders.length === 0) {
        // For items with no sales, provide baseline predictions
        predictions.push({
          id: itemId,
          itemId: itemId,
          itemName: menuItem.name || 'Unknown Item',
          predictedDemand: 0, // No sales data = 0 predicted demand
          confidence: 0.3, // Low confidence due to lack of data
          factors: {
            timeOfDay: 0,
            dayOfWeek: 0,
            season: 0.5,
            events: 0.5,
            trends: 0.3,
          },
          recommendations: ['No sales data available. Monitor performance after launch.', 'Consider promotional pricing to increase visibility.'],
          createdAt: new Date().toISOString(),
        });
        continue;
      }
      // Calculate average daily demand
      const totalQuantity = itemOrders.reduce((sum, o) => sum + o.quantity, 0);
      const avgDailyDemand = totalQuantity / 30;
      // Predict next 7 days (simple average)
      const predictedDemand = Math.round(avgDailyDemand * 7);
      // Calculate factors
      const timeOfDayFactor = itemOrders.filter(o => o._id.hour >= 11 && o._id.hour <= 14 || o._id.hour >= 18 && o._id.hour <= 21).length / itemOrders.length;
      const dayOfWeekFactor = itemOrders.filter(o => o._id.dayOfWeek >= 5 && o._id.dayOfWeek <= 7).length / itemOrders.length; // Weekend
      const seasonFactor = 0.7; // Placeholder - could be enhanced with actual seasonal data
      const eventsFactor = 0.5; // Placeholder - could be enhanced with event data
      const trendsFactor = avgDailyDemand > 5 ? 0.8 : 0.5; // Higher for popular items
      // Calculate confidence based on data availability
      const confidence = Math.min(0.95, Math.max(0.5, itemOrders.length / 20));
      // Generate recommendations
      const recommendations = [];
      if (predictedDemand > 50) {
        recommendations.push('High predicted demand - ensure adequate stock levels');
        recommendations.push('Consider promoting this item to maximize sales');
      } else if (predictedDemand < 10) {
        recommendations.push('Low predicted demand - consider promotional pricing');
        recommendations.push('Review if this item should remain on the menu');
      }
      if (timeOfDayFactor > 0.6) {
        recommendations.push('Peak demand during meal times - optimize preparation');
      }
      predictions.push({
        id: itemId,
        itemId: itemId,
        itemName: menuItem.name || 'Unknown Item',
        predictedDemand,
        confidence: Math.round(confidence * 100) / 100,
        factors: {
          timeOfDay: Math.round(timeOfDayFactor * 100) / 100,
          dayOfWeek: Math.round(dayOfWeekFactor * 100) / 100,
          season: Math.round(seasonFactor * 100) / 100,
          events: Math.round(eventsFactor * 100) / 100,
          trends: Math.round(trendsFactor * 100) / 100,
        },
        recommendations: recommendations.length > 0 ? recommendations : ['Monitor demand patterns for optimization opportunities'],
        createdAt: new Date().toISOString(),
      });
    }
    // Sort by predicted demand (descending)
    return predictions.sort((a, b) => b.predictedDemand - a.predictedDemand);
  }
  // Generate personalized offers for a customer
  async generatePersonalizedOffers(
    customerId: string,
    branchId: string,
  ): Promise<
    Array<{
      id: string;
      type: 'discount' | 'free_item' | 'bonus_points' | 'early_access';
      title: string;
      description: string;
      value: number;
      expiryDate: string;
      conditions?: string[];
    }>
  > {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID');
    }
    // Fetch customer data
    const customer = await this.customerModel
      .findById(customerId)
      .lean()
      .exec();
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    // Fetch customer order history
    const customerOrders = await this.posOrderModel
      .find({
        customerId: new Types.ObjectId(customerId),
        branchId: new Types.ObjectId(branchId),
        status: 'paid',
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    const totalOrders = customerOrders.length;
    const daysSinceLastOrder = customer.lastOrderDate
      ? Math.floor(
          (new Date().getTime() - new Date(customer.lastOrderDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;
    const avgOrderValue =
      totalOrders > 0
        ? customer.totalSpent / customer.totalOrders
        : customer.totalSpent;
    // Generate offers based on customer behavior
    const offers: Array<{
      id: string;
      type: 'discount' | 'free_item' | 'bonus_points' | 'early_access';
      title: string;
      description: string;
      value: number;
      expiryDate: string;
      conditions?: string[];
    }> = [];
    // Offer 1: Welcome discount for new customers
    if (totalOrders < 3) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      offers.push({
        id: `${customerId}-welcome-${Date.now()}`,
        type: 'discount',
        title: 'Welcome Discount',
        description: `Welcome! Enjoy 15% off on your next order. Valid for 30 days.`,
        value: 15,
        expiryDate: expiryDate.toISOString(),
        conditions: ['Minimum order value: $10', 'First-time customer offer'],
      });
    }
    // Offer 2: Loyalty points bonus for frequent customers
    if (totalOrders >= 5 && customer.loyaltyPoints < 500) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60);
      offers.push({
        id: `${customerId}-bonus-points-${Date.now()}`,
        type: 'bonus_points',
        title: 'Bonus Loyalty Points',
        description: `Earn 2x loyalty points on your next order!`,
        value: 100, // Bonus points
        expiryDate: expiryDate.toISOString(),
        conditions: ['Valid for next order only', 'Minimum order value: $20'],
      });
    }
    // Offer 3: Re-engagement offer for customers who haven't ordered in a while
    if (daysSinceLastOrder > 30 && daysSinceLastOrder < 90) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14);
      const discountValue = daysSinceLastOrder > 60 ? 20 : 10;
      offers.push({
        id: `${customerId}-reengage-${Date.now()}`,
        type: 'discount',
        title: 'We Miss You!',
        description: `Come back and enjoy ${discountValue}% off on your next order.`,
        value: discountValue,
        expiryDate: expiryDate.toISOString(),
        conditions: [
          'Valid for next order only',
          `Minimum order value: $${Math.max(15, Math.round(avgOrderValue * 0.5))}`,
        ],
      });
    }
    // Offer 4: Tier upgrade incentive
    const tierPoints = {
      bronze: 0,
      silver: 500,
      gold: 1000,
      platinum: 2000,
    };
    const nextTierPoints =
      customer.loyaltyTier === 'bronze'
        ? 500
        : customer.loyaltyTier === 'silver'
          ? 1000
          : customer.loyaltyTier === 'gold'
            ? 2000
            : Infinity;
    const pointsNeeded = nextTierPoints - customer.loyaltyPoints;
    if (pointsNeeded > 0 && pointsNeeded <= 200) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 45);
      offers.push({
        id: `${customerId}-tier-upgrade-${Date.now()}`,
        type: 'bonus_points',
        title: 'Tier Upgrade Boost',
        description: `You're ${pointsNeeded} points away from the next tier! Get bonus points to unlock exclusive benefits.`,
        value: pointsNeeded,
        expiryDate: expiryDate.toISOString(),
        conditions: [
          'Valid for next order only',
          'Minimum order value: $25',
          'Tier upgrade benefits apply immediately',
        ],
      });
    }
    // Offer 5: High-value customer VIP offer
    if (customer.totalSpent > 500 || customer.isVIP) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      offers.push({
        id: `${customerId}-vip-${Date.now()}`,
        type: 'early_access',
        title: 'VIP Early Access',
        description: `As a valued customer, get early access to new menu items and exclusive events.`,
        value: 0,
        expiryDate: expiryDate.toISOString(),
        conditions: ['VIP customer exclusive', 'Includes priority booking'],
      });
    }
    // Offer 6: Birthday/Anniversary special (if date available)
    if (customer.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(customer.dateOfBirth);
      const isBirthdayMonth =
        today.getMonth() === birthDate.getMonth() &&
        Math.abs(today.getDate() - birthDate.getDate()) <= 7;
      if (isBirthdayMonth) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        offers.push({
          id: `${customerId}-birthday-${Date.now()}`,
          type: 'free_item',
          title: 'Birthday Special!',
          description: `Happy Birthday! Enjoy a complimentary dessert with your next order.`,
          value: avgOrderValue * 0.15, // Estimated dessert value
          expiryDate: expiryDate.toISOString(),
          conditions: [
            'Valid during birthday month',
            'Minimum order value: $30',
            'Dessert selection based on availability',
          ],
        });
      }
    }
    // Sort offers by relevance (new customers first, then by value)
    offers.sort((a, b) => {
      if (a.type === 'discount' && b.type !== 'discount') return -1;
      if (b.type === 'discount' && a.type !== 'discount') return 1;
      return b.value - a.value;
    });
    // Limit to top 5 offers
    return offers.slice(0, 5);
  }
}