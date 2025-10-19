import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../customers/customers.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private customersService: CustomersService,
    private menuItemsService: MenuItemsService,
    private ingredientsService: IngredientsService,
  ) {}

  async getSalesSummary(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by date
    const dailySales = orders.reduce((acc, order) => {
      const date = order.completedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, orders: 0, revenue: 0 };
      }
      acc[date].orders += 1;
      acc[date].revenue += order.total;
      return acc;
    }, {});

    // Group by hour
    const hourlySales = orders.reduce((acc, order) => {
      const hour = order.completedAt.getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, orders: 0, revenue: 0 };
      }
      acc[hour].orders += 1;
      acc[hour].revenue += order.total;
      return acc;
    }, {});

    return {
      summary: {
        totalOrders,
        totalRevenue,
        totalTax,
        totalDiscount,
        averageOrderValue,
        netRevenue: totalRevenue - totalTax,
      },
      dailySales: Object.values(dailySales),
      hourlySales: Object.values(hourlySales).sort((a: any, b: any) => a.hour - b.hour),
      period: {
        startDate,
        endDate,
        days: Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      },
    };
  }

  async getOrdersAnalytics(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const completed = orders.filter((o) => o.status === 'completed');
    const cancelled = orders.filter((o) => o.status === 'cancelled');
    const pending = orders.filter((o) => o.status === 'pending');

    // By type
    const dineIn = completed.filter((o) => o.type === 'dine-in');
    const takeaway = completed.filter((o) => o.type === 'takeaway');
    const delivery = completed.filter((o) => o.type === 'delivery');

    // By payment method
    const paymentMethods = {};
    completed.forEach((order) => {
      order.payments.forEach((payment) => {
        if (!paymentMethods[payment.method]) {
          paymentMethods[payment.method] = { count: 0, amount: 0 };
        }
        paymentMethods[payment.method].count += 1;
        paymentMethods[payment.method].amount += payment.amount;
      });
    });

    return {
      total: orders.length,
      completed: completed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      completionRate: orders.length > 0 ? (completed.length / orders.length) * 100 : 0,
      cancellationRate: orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0,
      byType: {
        dineIn: {
          count: dineIn.length,
          revenue: dineIn.reduce((sum, o) => sum + o.total, 0),
        },
        takeaway: {
          count: takeaway.length,
          revenue: takeaway.reduce((sum, o) => sum + o.total, 0),
        },
        delivery: {
          count: delivery.length,
          revenue: delivery.reduce((sum, o) => sum + o.total, 0),
        },
      },
      paymentMethods,
    };
  }


  async getCategoryPerformance(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate },
      })
      .populate('items.menuItemId', 'name categoryId');

    const categoryStats = {};

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const categoryId = item.menuItemId?.categoryId?.toString();
        if (!categoryId) return;

        if (!categoryStats[categoryId]) {
          categoryStats[categoryId] = {
            categoryId,
            items: 0,
            revenue: 0,
            orders: new Set(),
          };
        }
        categoryStats[categoryId].items += item.quantity;
        categoryStats[categoryId].revenue += item.totalPrice;
        categoryStats[categoryId].orders.add(order._id.toString());
      });
    });

    // Convert Set to count
    const result = Object.values(categoryStats).map((stat: any) => ({
      ...stat,
      orders: stat.orders.size,
    }));

    return result.sort((a: any, b: any) => b.revenue - a.revenue);
  }

  async getCustomerAnalytics(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const stats = await this.customersService.getStats(companyId);

    const orders = await this.orderModel.find({
      companyId: new Types.ObjectId(companyId),
      customerId: { $exists: true, $ne: null },
      completedAt: { $gte: startDate, $lte: endDate },
    });

    // Customer retention
    const uniqueCustomers = new Set(orders.map((o) => o.customerId?.toString()));
    const repeatCustomers = {};

    orders.forEach((order) => {
      const customerId = order.customerId?.toString();
      if (!customerId) return;

      if (!repeatCustomers[customerId]) {
        repeatCustomers[customerId] = 0;
      }
      repeatCustomers[customerId] += 1;
    });

    const repeatCount = Object.values(repeatCustomers).filter(
      (count: any) => count > 1,
    ).length;

    return {
      ...stats,
      period: {
        uniqueCustomers: uniqueCustomers.size,
        repeatCustomers: repeatCount,
        repeatRate: uniqueCustomers.size > 0 ? (repeatCount / uniqueCustomers.size) * 100 : 0,
        totalOrders: orders.length,
        revenue: orders.reduce((sum, o) => sum + o.total, 0),
      },
    };
  }

  async getRevenueBreakdown(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    });

    const breakdown = {
      subtotal: 0,
      tax: 0,
      serviceCharge: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      netRevenue: 0,
    };

    orders.forEach((order) => {
      breakdown.subtotal += order.subtotal;
      breakdown.tax += order.taxAmount;
      breakdown.serviceCharge += order.serviceChargeAmount || 0;
      breakdown.deliveryFee += order.deliveryFee || 0;
      breakdown.discount += order.discountAmount || 0;
      breakdown.total += order.total;
    });

    breakdown.netRevenue = breakdown.total - breakdown.tax;

    return breakdown;
  }

  async getPeakHours(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    });

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      orders: 0,
      revenue: 0,
    }));

    orders.forEach((order) => {
      const hour = order.completedAt.getHours();
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += order.total;
    });

    // Find peak hours
    const sorted = [...hourlyData].sort((a, b) => b.orders - a.orders);
    const peakHours = sorted.slice(0, 3);

    return {
      hourlyData,
      peakHours,
      busiestHour: sorted[0],
      quietestHour: sorted[sorted.length - 1],
    };
  }

  async getInventoryReport(companyId: string): Promise<any> {
    const stats = await this.ingredientsService.getStats(companyId);
    const valuation = await this.ingredientsService.getValuation(companyId);
    const lowStock = await this.ingredientsService.findLowStock(companyId);
    const outOfStock = await this.ingredientsService.findOutOfStock(companyId);
    const needReorder = await this.ingredientsService.findNeedReorder(companyId);

    return {
      stats,
      valuation: {
        total: valuation.totalValue,
        items: valuation.items.length,
      },
      alerts: {
        lowStock: lowStock.map((i) => ({
          // @ts-ignore - Mongoose document _id
          id: i._id,
          name: i.name,
          currentStock: i.currentStock,
          minimumStock: i.minimumStock,
        })),
        outOfStock: outOfStock.map((i) => ({
          // @ts-ignore - Mongoose document _id
          id: i._id,
          name: i.name,
        })),
        needReorder: needReorder.map((i) => ({
          // @ts-ignore - Mongoose document _id
          id: i._id,
          name: i.name,
          currentStock: i.currentStock,
          reorderPoint: i.reorderPoint,
          reorderQuantity: i.reorderQuantity,
        })),
      },
    };
  }

  async getDashboardStats(
    branchId?: string,
    companyId?: string,
  ): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const todayFilter: any = {
      createdAt: { $gte: today, $lt: tomorrow },
    };
    if (branchId) {
      todayFilter.branchId = new Types.ObjectId(branchId);
    }
    const todayOrders = await this.orderModel.find(todayFilter);

    const todayCompleted = todayOrders.filter((o) => o.status === 'completed');
    const todayRevenue = todayCompleted.reduce((sum, o) => sum + o.total, 0);

    // This week
    const weekFilter: any = {
      createdAt: { $gte: thisWeekStart },
      status: 'completed',
    };
    if (branchId) {
      weekFilter.branchId = new Types.ObjectId(branchId);
    }
    const weekOrders = await this.orderModel.find(weekFilter);

    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);

    // This month
    const monthFilter: any = {
      createdAt: { $gte: thisMonthStart },
      status: 'completed',
    };
    if (branchId) {
      monthFilter.branchId = new Types.ObjectId(branchId);
    }
    const monthOrders = await this.orderModel.find(monthFilter);

    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    // Active orders
    const activeFilter: any = {
      status: { $nin: ['completed', 'cancelled'] },
    };
    if (branchId) {
      activeFilter.branchId = new Types.ObjectId(branchId);
    }
    const activeOrders = await this.orderModel.countDocuments(activeFilter);

    // Customer stats
    const customerStats = companyId ? await this.customersService.getStats(companyId) : { total: 0, active: 0, vip: 0 };

    // Inventory alerts
    const lowStock = companyId ? await this.ingredientsService.findLowStock(companyId) : [];
    const outOfStock = companyId ? await this.ingredientsService.findOutOfStock(companyId) : [];

    return {
      today: {
        orders: todayOrders.length,
        completed: todayCompleted.length,
        revenue: todayRevenue,
        averageOrderValue:
          todayCompleted.length > 0 ? todayRevenue / todayCompleted.length : 0,
      },
      week: {
        orders: weekOrders.length,
        revenue: weekRevenue,
      },
      month: {
        orders: monthOrders.length,
        revenue: monthRevenue,
      },
      active: {
        orders: activeOrders,
      },
      customers: {
        total: customerStats.total,
        active: customerStats.active,
        vip: customerStats.vip,
      },
      inventory: {
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
      },
      timestamp: new Date(),
    };
  }

  async getComparisonReport(
    branchId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
  ): Promise<any> {
    const currentOrders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: currentStart, $lte: currentEnd },
    });

    const previousOrders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: previousStart, $lte: previousEnd },
    });

    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);

    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const ordersChange =
      previousOrders.length > 0
        ? ((currentOrders.length - previousOrders.length) /
            previousOrders.length) *
          100
        : 0;

    return {
      current: {
        orders: currentOrders.length,
        revenue: currentRevenue,
        averageOrderValue:
          currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
      },
      previous: {
        orders: previousOrders.length,
        revenue: previousRevenue,
        averageOrderValue:
          previousOrders.length > 0
            ? previousRevenue / previousOrders.length
            : 0,
      },
      change: {
        orders: ordersChange,
        revenue: revenueChange,
        ordersCount: currentOrders.length - previousOrders.length,
        revenueAmount: currentRevenue - previousRevenue,
      },
    };
  }

  async getSalesAnalytics(period: string = 'week', branchId?: string): Promise<any> {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    const filter: any = {
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    const orders = await this.orderModel.find(filter);

    // Group by date
    const dailyData = {};
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        revenue: 0,
        orders: 0,
        averageOrderValue: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    orders.forEach((order) => {
      const dateKey = order.completedAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].revenue += order.total;
        dailyData[dateKey].orders += 1;
      }
    });

    // Calculate average order value
    Object.values(dailyData).forEach((day: any) => {
      day.averageOrderValue = day.orders > 0 ? day.revenue / day.orders : 0;
    });

    return {
      period,
      data: Object.values(dailyData),
      summary: {
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
      },
    };
  }

  async getTopSellingItems(limit: number = 10, branchId?: string): Promise<any> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 30); // Last 30 days

    const filter: any = {
      status: 'completed',
      completedAt: { $gte: startDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    const orders = await this.orderModel.find(filter);

    // Aggregate items
    const itemStats = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.menuItemId.toString();
        if (!itemStats[key]) {
          itemStats[key] = {
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: 0,
            revenue: 0,
            orders: 0,
          };
        }
        itemStats[key].quantity += item.quantity;
        itemStats[key].revenue += item.totalPrice;
        itemStats[key].orders += 1;
      });
    });

    const topItems = Object.values(itemStats)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, limit);

    return topItems;
  }

  async getRevenueByCategory(branchId?: string): Promise<any> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 30); // Last 30 days

    const filter: any = {
      status: 'completed',
      completedAt: { $gte: startDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    const orders = await this.orderModel
      .find(filter)
      .populate('items.menuItemId', 'name categoryId');

    const categoryStats = {};

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const categoryId = item.menuItemId?.categoryId?.toString();
        if (!categoryId) return;

        if (!categoryStats[categoryId]) {
          categoryStats[categoryId] = {
            categoryId,
            items: 0,
            revenue: 0,
            orders: new Set(),
          };
        }
        categoryStats[categoryId].items += item.quantity;
        categoryStats[categoryId].revenue += item.totalPrice;
        categoryStats[categoryId].orders.add(order._id.toString());
      });
    });

    // Convert Set to count and calculate percentages
    const result = Object.values(categoryStats).map((stat: any) => ({
      ...stat,
      orders: stat.orders.size,
    }));

    const totalRevenue = result.reduce((sum: number, stat: any) => sum + stat.revenue, 0);

    return result
      .map((stat: any) => ({
        ...stat,
        percentage: totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);
  }

  async getLowStockItems(companyId?: string): Promise<any> {
    if (!companyId) return [];
    return this.ingredientsService.findLowStock(companyId);
  }
}

