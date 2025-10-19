import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import OpenAI from 'openai';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class AiService {
  private openai: OpenAI;
  // private readonly logger = new WinstonLoggerService('AiService');

  constructor(
    private configService: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');

    if (!apiKey) {
      // this.logger.warn('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });
  }

  // Sales prediction using historical data
  async predictSales(
    companyId: MongooseSchema.Types.ObjectId,
    branchId?: MongooseSchema.Types.ObjectId,
    daysAhead: number = 7,
  ): Promise<any> {
    try {
      // Get historical sales data (last 90 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const query: any = { companyId, createdAt: { $gte: startDate } };
      if (branchId) query.branchId = branchId;

      const orders = await this.orderModel
        .find(query)
        .select('total createdAt type')
        .lean()
        .exec();

      // Group by date
      const dailySales = this.groupSalesByDate(orders);

      // Prepare data for AI
      const prompt = `Based on the following ${dailySales.length} days of sales data, predict the sales for the next ${daysAhead} days. Provide daily predictions with reasoning.

Sales History (date: total):
${dailySales.map((d) => `${d.date}: $${d.total.toFixed(2)}`).join('\n')}

Please analyze trends, identify patterns (weekdays vs weekends, growth/decline), and provide:
1. Daily sales predictions for the next ${daysAhead} days
2. Key factors influencing the predictions
3. Confidence level for each prediction
4. Recommendations to maximize sales

Format the response as JSON with this structure:
{
  "predictions": [{"date": "YYYY-MM-DD", "predictedSales": number, "confidence": "high|medium|low"}],
  "trends": string,
  "recommendations": [string],
  "summary": string
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant sales analyst with expertise in predictive analytics and trend analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        ...result,
        historicalData: dailySales,
        generatedAt: new Date(),
      };
    } catch (error) {
      // this.logger.error('Failed to predict sales', error);
      throw error;
    }
  }

  // Recommend optimal pricing for menu items
  async recommendPricing(
    menuItemId: MongooseSchema.Types.ObjectId,
  ): Promise<any> {
    try {
      const menuItem = await this.menuItemModel.findById(menuItemId).lean().exec();

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      // Get sales performance
      const orders = await this.orderModel
        .find({
          'items.menuItemId': menuItemId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
        .lean()
        .exec();

      const totalSales = orders.reduce((sum, order) => {
        const item = order.items.find((i: any) => i.menuItemId.toString() === menuItemId.toString());
        return sum + (item?.quantity || 0);
      }, 0);

      const totalRevenue = orders.reduce((sum, order) => {
        const item = order.items.find((i: any) => i.menuItemId.toString() === menuItemId.toString());
        // @ts-ignore - Mongoose schema field
        return sum + (item?.subtotal || 0);
      }, 0);

      const prompt = `Analyze this menu item and recommend optimal pricing strategy:

Item Details:
- Name: ${menuItem.name}
- Current Price: $${menuItem.price}
- Category: ${(menuItem as any).category || 'N/A'}
- Description: ${menuItem.description}
- Cost (estimated): $${menuItem.price * 0.35} (35% food cost assumption)

Performance (Last 30 days):
- Units Sold: ${totalSales}
- Revenue Generated: $${totalRevenue.toFixed(2)}
- Average Sales per Day: ${(totalSales / 30).toFixed(1)}

Provide:
1. Recommended price with justification
2. Price elasticity analysis
3. Profit margin optimization
4. Competitive positioning strategy
5. A/B testing suggestions

Format response as JSON:
{
  "recommendedPrice": number,
  "currentPrice": number,
  "priceChange": number,
  "justification": string,
  "projectedImpact": {
    "salesVolume": string,
    "revenue": string,
    "profitMargin": string
  },
  "strategies": [string],
  "testingPlan": string
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant pricing strategist with expertise in menu engineering and revenue optimization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      // this.logger.error('Failed to recommend pricing', error);
      throw error;
    }
  }

  // Identify peak hours and optimize staffing
  async analyzePeakHours(
    companyId: MongooseSchema.Types.ObjectId,
    branchId?: MongooseSchema.Types.ObjectId,
  ): Promise<any> {
    try {
      // Get orders from last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const query: any = { companyId, createdAt: { $gte: startDate } };
      if (branchId) query.branchId = branchId;

      const orders = await this.orderModel
        .find(query)
        .select('createdAt total')
        .lean()
        .exec();

      // Group by hour and day of week
      const hourlyData = this.groupOrdersByHour(orders);
      const weeklyData = this.groupOrdersByDayOfWeek(orders);

      const prompt = `Analyze restaurant traffic patterns and provide staffing recommendations:

Hourly Distribution (24-hour format):
${hourlyData.map((h) => `${h.hour}:00 - ${h.orderCount} orders, $${h.revenue.toFixed(2)}`).join('\n')}

Weekly Distribution:
${weeklyData.map((d) => `${d.day} - ${d.orderCount} orders, $${d.revenue.toFixed(2)}`).join('\n')}

Provide:
1. Peak hours identification
2. Off-peak hours identification
3. Staffing recommendations by time slot
4. Marketing opportunities for slow periods
5. Kitchen capacity planning

Format as JSON:
{
  "peakHours": [{"time": string, "reason": string}],
  "offPeakHours": [{"time": string, "opportunity": string}],
  "staffingPlan": {
    "morning": {"waiters": number, "chefs": number},
    "lunch": {"waiters": number, "chefs": number},
    "dinner": {"waiters": number, "chefs": number},
    "late": {"waiters": number, "chefs": number}
  },
  "marketingOpportunities": [string],
  "recommendations": [string]
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant operations consultant specializing in workforce optimization and capacity planning.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        ...result,
        hourlyData,
        weeklyData,
        generatedAt: new Date(),
      };
    } catch (error) {
      // this.logger.error('Failed to analyze peak hours', error);
      throw error;
    }
  }

  // Generate personalized customer recommendations
  async getCustomerRecommendations(
    customerId: MongooseSchema.Types.ObjectId,
  ): Promise<any> {
    try {
      const customer = await this.customerModel.findById(customerId).lean().exec();

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get customer order history
      const orders = await this.orderModel
        .find({ customerId })
        .populate('items.menuItemId')
        .lean()
        .exec();

      const orderedItems = orders.flatMap((order) =>
        order.items.map((item: any) => item.menuItemId?.name || 'Unknown'),
      );

      const prompt = `Based on this customer's profile and order history, recommend menu items they might enjoy:

Customer Profile:
- Total Orders: ${customer.totalOrders}
- Total Spent: $${customer.totalSpent.toFixed(2)}
- Loyalty Tier: ${customer.loyaltyTier}
- Average Order Value: $${(customer.totalSpent / customer.totalOrders).toFixed(2)}

Previous Orders (${orderedItems.length} items):
${orderedItems.slice(0, 20).join(', ')}

Provide:
1. 5 personalized menu recommendations
2. Reasoning for each recommendation
3. Upselling opportunities
4. Special offers that would appeal to this customer

Format as JSON:
{
  "recommendations": [
    {
      "item": string,
      "reason": string,
      "confidence": "high|medium|low"
    }
  ],
  "upsellingOpportunities": [string],
  "specialOffers": [string],
  "customerInsights": string
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant personalization expert specializing in customer behavior analysis and menu recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      // this.logger.error('Failed to get customer recommendations', error);
      throw error;
    }
  }

  // Analyze menu performance and suggest improvements
  async analyzeMenuPerformance(
    companyId: MongooseSchema.Types.ObjectId,
    branchId?: MongooseSchema.Types.ObjectId,
  ): Promise<any> {
    try {
      const query: any = { companyId };
      if (branchId) query.branchId = branchId;

      const menuItems = await this.menuItemModel.find(query).lean().exec();

      // Get sales data for each item
      const itemPerformance = await Promise.all(
        menuItems.slice(0, 50).map(async (item) => {
          const orders = await this.orderModel
            .find({
              'items.menuItemId': item._id,
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            })
            .lean()
            .exec();

          const totalSold = orders.reduce((sum, order) => {
            const orderItem = order.items.find((i: any) => i.menuItemId.toString() === item._id.toString());
            return sum + (orderItem?.quantity || 0);
          }, 0);

          const revenue = orders.reduce((sum, order) => {
            const orderItem = order.items.find((i: any) => i.menuItemId.toString() === item._id.toString());
            // @ts-ignore - Mongoose schema field
            return sum + (orderItem?.subtotal || 0);
          }, 0);

          return {
            name: item.name,
            category: (item as any).category || 'N/A',
            price: item.price,
            unitsSold: totalSold,
            revenue: revenue,
          };
        }),
      );

      const prompt = `Analyze this restaurant menu performance and provide strategic recommendations:

Menu Performance (Last 30 days):
${itemPerformance
  .map((item) => `${item.name} ($${item.price}) - ${item.unitsSold} units, $${item.revenue.toFixed(2)} revenue`)
  .join('\n')}

Provide comprehensive menu engineering analysis:
1. Stars (High profit, High popularity)
2. Plowhorses (Low profit, High popularity)
3. Puzzles (High profit, Low popularity)
4. Dogs (Low profit, Low popularity)
5. Action items for each category
6. New menu item suggestions
7. Items to discontinue

Format as JSON:
{
  "categories": {
    "stars": [{"item": string, "action": string}],
    "plowhorses": [{"item": string, "action": string}],
    "puzzles": [{"item": string, "action": string}],
    "dogs": [{"item": string, "action": string}]
  },
  "newItemSuggestions": [{"name": string, "reasoning": string}],
  "itemsToDiscontinue": [string],
  "generalRecommendations": [string],
  "summary": string
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a menu engineering expert specializing in restaurant profitability optimization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        ...result,
        rawData: itemPerformance,
        generatedAt: new Date(),
      };
    } catch (error) {
      // this.logger.error('Failed to analyze menu performance', error);
      throw error;
    }
  }

  // Generate business insights summary
  async generateBusinessInsights(
    companyId: MongooseSchema.Types.ObjectId,
    branchId?: MongooseSchema.Types.ObjectId,
    period: 'week' | 'month' | 'quarter' = 'month',
  ): Promise<any> {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query: any = { companyId, createdAt: { $gte: startDate } };
      if (branchId) query.branchId = branchId;

      const [orders, customers, menuItems] = await Promise.all([
        this.orderModel.find(query).lean().exec(),
        this.customerModel.find({ companyId }).lean().exec(),
        this.menuItemModel.find({ companyId }).lean().exec(),
      ]);

      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalRevenue / orders.length;
      const newCustomers = customers.filter(
        // @ts-ignore - Mongoose schema timestamps
        (c) => c.createdAt >= startDate,
      ).length;

      const prompt = `Generate comprehensive business insights for this restaurant:

Performance Summary (Last ${days} days):
- Total Orders: ${orders.length}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Average Order Value: $${averageOrderValue.toFixed(2)}
- New Customers: ${newCustomers}
- Total Menu Items: ${menuItems.length}
- Active Customers: ${customers.length}

Provide:
1. Key performance highlights
2. Areas of concern
3. Growth opportunities
4. Competitive positioning insights
5. Action items (prioritized)
6. Financial health assessment

Format as JSON:
{
  "highlights": [string],
  "concerns": [string],
  "opportunities": [string],
  "actionItems": [{"priority": "high|medium|low", "action": string}],
  "financialHealth": string,
  "overallScore": number,
  "summary": string
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant business consultant with expertise in performance analysis and strategic planning.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      // this.logger.error('Failed to generate business insights', error);
      throw error;
    }
  }

  // Helper methods
  private groupSalesByDate(orders: any[]): any[] {
    const grouped: any = {};

    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, total: 0, count: 0 };
      }
      grouped[date].total += order.total;
      grouped[date].count += 1;
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  private groupOrdersByHour(orders: any[]): any[] {
    const grouped: any = {};

    for (let hour = 0; hour < 24; hour++) {
      grouped[hour] = { hour, orderCount: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      grouped[hour].orderCount += 1;
      grouped[hour].revenue += order.total;
    });

    return Object.values(grouped);
  }

  private groupOrdersByDayOfWeek(orders: any[]): any[] {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped: any = {};

    days.forEach((day, index) => {
      grouped[index] = { day, orderCount: 0, revenue: 0 };
    });

    orders.forEach((order) => {
      const dayIndex = new Date(order.createdAt).getDay();
      grouped[dayIndex].orderCount += 1;
      grouped[dayIndex].revenue += order.total;
    });

    return Object.values(grouped);
  }
}

