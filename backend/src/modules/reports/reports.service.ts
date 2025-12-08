import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../customers/customers.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { WastageService } from '../wastage/wastage.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(POSOrder.name)
    private posOrderModel: Model<POSOrderDocument>,
    private customersService: CustomersService,
    private menuItemsService: MenuItemsService,
    private ingredientsService: IngredientsService,
    private wastageService: WastageService,
  ) {}

  async getSalesSummary(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'paid',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalTax = 0; // POSOrder doesn't have separate tax field
    const totalDiscount = 0; // POSOrder doesn't have separate discount field
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by date
    const dailySales = orders.reduce((acc, order: any) => {
      const date = (order.createdAt || new Date()).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, orders: 0, revenue: 0 };
      }
      acc[date].orders += 1;
      acc[date].revenue += (order.totalAmount || 0);
      return acc;
    }, {});

    // Group by hour
    const hourlySales = orders.reduce((acc, order: any) => {
      const hour = (order.createdAt || new Date()).getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, orders: 0, revenue: 0 };
      }
      acc[hour].orders += 1;
      acc[hour].revenue += (order.totalAmount || 0);
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
    const orders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const paid = orders.filter((o) => o.status === 'paid');
    const cancelled = orders.filter((o) => o.status === 'cancelled');
    const pending = orders.filter((o) => o.status === 'pending');

    // By type
    const dineIn = paid.filter((o) => o.orderType === 'dine-in');
    const takeaway = paid.filter((o) => o.orderType === 'takeaway');
    const delivery = paid.filter((o) => o.orderType === 'delivery');

    // By payment method - POS orders have paymentMethod field
    const paymentMethods = {};
    paid.forEach((order) => {
      const method = order.paymentMethod || 'unknown';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].amount += (order.totalAmount || 0);
    });

    return {
      total: orders.length,
      completed: paid.length,
      cancelled: cancelled.length,
      pending: pending.length,
      completionRate: orders.length > 0 ? (paid.length / orders.length) * 100 : 0,
      cancellationRate: orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0,
      byType: {
        dineIn: {
          count: dineIn.length,
          revenue: dineIn.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        },
        takeaway: {
          count: takeaway.length,
          revenue: takeaway.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        },
        delivery: {
          count: delivery.length,
          revenue: delivery.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
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
    const orders = await this.posOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'paid',
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('items.menuItemId', 'name categoryId');

    const categoryStats = {};

    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
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
          categoryStats[categoryId].items += (item.quantity || 0);
          categoryStats[categoryId].revenue += (item.price || 0) * (item.quantity || 0);
          categoryStats[categoryId].orders.add(order._id.toString());
        });
      }
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

    // POSOrder doesn't have companyId, need to filter by branchId through company
    // For now, get all orders with customerInfo
    const orders = await this.posOrderModel.find({
      customerInfo: { $exists: true, $ne: null },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Customer retention - use customerInfo.phone or customerInfo.email as identifier
    const uniqueCustomers = new Set(
      orders
        .map((o) => o.customerInfo?.phone || o.customerInfo?.email)
        .filter(Boolean)
    );
    const repeatCustomers = {};

    orders.forEach((order) => {
      const customerId = order.customerInfo?.phone || order.customerInfo?.email;
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
        revenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      },
    };
  }

  async getRevenueBreakdown(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'paid',
      createdAt: { $gte: startDate, $lte: endDate },
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
      breakdown.subtotal += (order.totalAmount || 0);
      breakdown.tax += 0; // POSOrder doesn't have separate tax field
      breakdown.serviceCharge += 0; // POSOrder doesn't have separate service charge field
      breakdown.deliveryFee += (order.deliveryFee || 0);
      breakdown.discount += 0; // POSOrder doesn't have separate discount field
      breakdown.total += (order.totalAmount || 0);
    });

    breakdown.netRevenue = breakdown.total - breakdown.tax;

    return breakdown;
  }

  async getPeakHours(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'paid',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      orders: 0,
      revenue: 0,
    }));

    orders.forEach((order: any) => {
      const hour = (order.createdAt || new Date()).getHours();
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += (order.totalAmount || 0);
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
    const todayOrders = await this.posOrderModel.find(todayFilter);

    const todayPaid = todayOrders.filter((o) => o.status === 'paid');
    const todayRevenue = todayPaid.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // This week
    const weekFilter: any = {
      createdAt: { $gte: thisWeekStart },
      status: 'paid',
    };
    if (branchId) {
      weekFilter.branchId = new Types.ObjectId(branchId);
    }
    const weekOrders = await this.posOrderModel.find(weekFilter);

    const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // This month
    const monthFilter: any = {
      createdAt: { $gte: thisMonthStart },
      status: 'paid',
    };
    if (branchId) {
      monthFilter.branchId = new Types.ObjectId(branchId);
    }
    const monthOrders = await this.posOrderModel.find(monthFilter);

    const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Active orders
    const activeFilter: any = {
      status: { $nin: ['paid', 'cancelled'] },
    };
    if (branchId) {
      activeFilter.branchId = new Types.ObjectId(branchId);
    }
    const activeOrders = await this.posOrderModel.countDocuments(activeFilter);

    // Customer stats
    const customerStats = companyId ? await this.customersService.getStats(companyId) : { total: 0, active: 0, vip: 0 };

    // Inventory alerts
    const lowStock = companyId ? await this.ingredientsService.findLowStock(companyId) : [];
    const outOfStock = companyId ? await this.ingredientsService.findOutOfStock(companyId) : [];

    return {
      today: {
        orders: todayOrders.length,
        completed: todayPaid.length,
        revenue: todayRevenue,
        averageOrderValue:
          todayPaid.length > 0 ? todayRevenue / todayPaid.length : 0,
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
    const currentOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'paid',
      createdAt: { $gte: currentStart, $lte: currentEnd },
    });

    const previousOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'paid',
      createdAt: { $gte: previousStart, $lte: previousEnd },
    });

    const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

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

  async getSalesAnalytics(period: string = 'week', branchId?: string, customStartDate?: Date, customEndDate?: Date): Promise<any> {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    // Use custom dates if provided, otherwise calculate from period
    if (customStartDate && customEndDate) {
      // Parse dates - extract UTC date components to preserve the intended date
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      // Use UTC date components from the ISO string to get the correct date
      // This ensures that if frontend sends "2025-12-08T00:00:00.000Z", we get "2025-12-08"
      const startDateStr = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
      const endDateStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
      
      // Create dates in UTC - start at 00:00:00, end at 23:59:59.999
      startDate = new Date(startDateStr + 'T00:00:00.000Z');
      endDate = new Date(endDateStr + 'T23:59:59.999Z');
      
      console.log('📅 Using custom dates:', {
        originalStart: customStartDate,
        originalEnd: customEndDate,
        startDateStr,
        endDateStr,
        parsedStart: startDate.toISOString(),
        parsedEnd: endDate.toISOString(),
      });
    } else {
      switch (period) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
      }
    }

    // Include orders that are paid OR have a paymentId (indicating payment was processed)
    const filter: any = {
      $or: [
        { status: 'paid' },
        { paymentId: { $exists: true, $ne: null } }, // Orders with payment processed
      ],
      createdAt: { $gte: startDate, $lte: endDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    // Debug logging
    console.log('🔍 Reports Filter:', {
      period,
      branchId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filter,
    });

    const orders = await this.posOrderModel.find(filter);
    
    // Debug logging
    console.log('📊 Orders Found:', {
      count: orders.length,
      sampleOrder: orders.length > 0 ? {
        orderNumber: orders[0].orderNumber,
        status: orders[0].status,
        totalAmount: orders[0].totalAmount,
        createdAt: (orders[0] as any).createdAt,
        branchId: orders[0].branchId,
      } : null,
    });

    // Also check total orders without status filter for debugging
    const allOrdersCount = await this.posOrderModel.countDocuments({
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      createdAt: { $gte: startDate, $lte: endDate },
    });
    console.log('📊 All Orders (any status) in date range:', allOrdersCount);
    
    // Check orders by status
    const ordersByStatus = await this.posOrderModel.aggregate([
      {
        $match: {
          ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    console.log('📊 Orders by Status:', ordersByStatus);

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

    orders.forEach((order: any) => {
      const orderDate = order.createdAt || new Date();
      // Use UTC date to match the dateKey format (YYYY-MM-DD)
      const dateKey = new Date(orderDate).toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].revenue += (order.totalAmount || 0);
        dailyData[dateKey].orders += 1;
      } else {
        // Log if date key doesn't match (helps debug timezone issues)
        console.log('⚠️ Order date not in dailyData range:', {
          orderNumber: order.orderNumber,
          orderDate: orderDate,
          dateKey,
          orderTotal: order.totalAmount,
          availableDateKeys: Object.keys(dailyData).slice(0, 10),
        });
      }
    });

    // Calculate average order value
    Object.values(dailyData).forEach((day: any) => {
      day.averageOrderValue = day.orders > 0 ? day.revenue / day.orders : 0;
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    console.log('📊 Summary Calculation:', {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      dailyDataEntries: Object.keys(dailyData).length,
      dailyDataWithOrders: Object.values(dailyData).filter((d: any) => d.orders > 0).length,
    });

    return {
      period,
      data: Object.values(dailyData),
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
      },
    };
  }

  async getTopSellingItems(limit: number = 10, branchId?: string): Promise<any> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 30); // Last 30 days

    const filter: any = {
      status: 'paid',
      createdAt: { $gte: startDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    // Use aggregation pipeline to properly join with menu items
    const pipeline: any[] = [
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          menuItemId: '$_id',
          name: { $ifNull: ['$menuItem.name', '$items.name', 'Unknown Item'] },
          quantity: 1,
          revenue: 1,
          orders: 1,
        },
      },
    ];

    const topItems = await this.posOrderModel.aggregate(pipeline);

    // Transform to match expected format
    return topItems.map((item: any) => ({
      menuItemId: item.menuItemId,
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 0,
      revenue: item.revenue || 0,
      orders: item.orders || 0,
    }));
  }

  async getRevenueByCategory(branchId?: string, customStartDate?: Date, customEndDate?: Date): Promise<any> {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Use custom dates if provided, otherwise default to last 30 days
    if (customStartDate && customEndDate) {
      // Parse dates - extract UTC date components to preserve the intended date
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      // Use UTC date components to get the correct date from the ISO string
      const startDateStr = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
      const endDateStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
      
      // Create dates in UTC - start at 00:00:00, end at 23:59:59.999
      startDate = new Date(startDateStr + 'T00:00:00.000Z');
      endDate = new Date(endDateStr + 'T23:59:59.999Z');
    } else {
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Include orders that are paid OR have a paymentId (indicating payment was processed)
    const filter: any = {
      $or: [
        { status: 'paid' },
        { paymentId: { $exists: true, $ne: null } }, // Orders with payment processed
      ],
      createdAt: { $gte: startDate, $lte: endDate },
    };
    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    console.log('📊 getRevenueByCategory - Filter:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId,
      filter,
    });

    // Use aggregation to properly populate nested categoryId
    const orders = await this.posOrderModel.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItemId',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'menuItem.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          orderNumber: { $first: '$orderNumber' },
          items: {
            $push: {
              menuItemId: '$items.menuItemId',
              name: '$items.name',
              quantity: '$items.quantity',
              price: '$items.price',
              categoryId: '$category._id',
              categoryName: '$category.name',
            },
          },
        },
      },
    ]);

    // Transform back to order-like structure for compatibility
    const transformedOrders = orders.map((order: any) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      items: order.items.map((item: any) => ({
        menuItemId: {
          _id: item.menuItemId,
          name: item.name,
          categoryId: item.categoryId ? {
            _id: item.categoryId,
            name: item.categoryName,
          } : null,
        },
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    console.log('📊 getRevenueByCategory - Orders Found:', {
      count: transformedOrders.length,
      sampleOrder: transformedOrders[0] ? {
        orderNumber: transformedOrders[0].orderNumber,
        itemsCount: transformedOrders[0].items?.length,
        firstItem: transformedOrders[0].items?.[0] ? {
          menuItemId: transformedOrders[0].items[0].menuItemId?._id,
          categoryId: transformedOrders[0].items[0].menuItemId?.categoryId?._id,
          categoryName: transformedOrders[0].items[0].menuItemId?.categoryId?.name,
        } : null,
      } : null,
    });

    const categoryStats = {};
    let itemsWithoutCategory = 0;
    let itemsWithCategory = 0;

    transformedOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          // Try multiple ways to get categoryId
          let categoryId: string | null = null;
          let categoryName = 'Uncategorized';
          
          // Check if menuItemId is populated
          if (item.menuItemId) {
            // Try different paths for categoryId
            if (item.menuItemId.categoryId) {
              if (typeof item.menuItemId.categoryId === 'object') {
                // Populated category object
                categoryId = item.menuItemId.categoryId._id?.toString() || item.menuItemId.categoryId.toString();
                categoryName = item.menuItemId.categoryId.name || 'Uncategorized';
              } else {
                // Just an ObjectId reference
                categoryId = item.menuItemId.categoryId.toString();
              }
            }
          }
          
          // If still no categoryId, use 'Uncategorized' as a fallback
          if (!categoryId) {
            categoryId = 'uncategorized';
            itemsWithoutCategory++;
          } else {
            itemsWithCategory++;
          }

          if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
              categoryId,
              category: categoryName,
              items: 0,
              revenue: 0,
              sales: 0,
              orders: new Set(),
            };
          }
          categoryStats[categoryId].items += (item.quantity || 0);
          const itemRevenue = (item.price || 0) * (item.quantity || 0);
          categoryStats[categoryId].revenue += itemRevenue;
          categoryStats[categoryId].sales += itemRevenue;
          categoryStats[categoryId].orders.add(order._id.toString());
        });
      }
    });

    console.log('📊 getRevenueByCategory - Category Stats:', {
      itemsWithCategory,
      itemsWithoutCategory,
      categoryCount: Object.keys(categoryStats).length,
      categories: Object.keys(categoryStats).map(key => ({
        categoryId: categoryStats[key].categoryId,
        category: categoryStats[key].category,
        revenue: categoryStats[key].revenue,
      })),
    });

    // Convert Set to count and calculate percentages
    const result = Object.values(categoryStats).map((stat: any) => ({
      ...stat,
      orders: stat.orders.size,
    }));

    const totalRevenue = result.reduce((sum: number, stat: any) => sum + stat.revenue, 0);

    const finalResult = result
      .map((stat: any) => ({
        categoryId: stat.categoryId,
        category: stat.category,
        sales: stat.sales || stat.revenue,
        revenue: stat.revenue,
        percentage: totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    console.log('📊 getRevenueByCategory - Final Result:', {
      totalRevenue,
      categoryCount: finalResult.length,
      categories: finalResult.map((cat: any) => ({
        category: cat.category,
        revenue: cat.revenue,
        percentage: cat.percentage,
      })),
    });

    return finalResult;
  }

  async getWastageReport(
    branchId?: string,
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const stats = await this.wastageService.getWastageStats(
      branchId,
      companyId,
      startDate,
      endDate,
    );

    const totalCost = stats.summary.totalCost || 0;

    return {
      summary: {
        totalWastageCount: stats.summary.totalWastageCount || 0,
        totalQuantity: stats.summary.totalQuantity || 0,
        totalCost,
        avgWastageCost: stats.summary.avgWastageCost || 0,
        wastageRate: stats.summary.wastageRate || 0,
      },
      byReason: (stats.byReason || []).map((item: any) => ({
        reason: item._id,
        count: item.count,
        totalQuantity: item.totalQuantity,
        totalCost: item.totalCost,
        percentage: totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0,
      })),
      byIngredient: (stats.byIngredient || []).map((item: any) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName || 'Unknown',
        ingredientUnit: item.ingredientUnit || '',
        count: item.count,
        totalQuantity: item.totalQuantity,
        totalCost: item.totalCost,
        percentage: totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0,
      })),
      dailyTrend: (stats.dailyTrend || []).map((item: any) => ({
        date: item._id,
        count: item.count,
        totalQuantity: item.totalQuantity,
        totalCost: item.totalCost,
      })),
    };
  }

  async getLowStockItems(companyId?: string): Promise<any> {
    if (!companyId) return [];
    return this.ingredientsService.findLowStock(companyId);
  }

  async getDueSettlements(branchId?: string, companyId?: string): Promise<any> {
    const filter: any = {
      status: 'pending', // Orders that are completed but payment is pending
    };

    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    // If companyId is provided, we need to filter through branches
    // For now, we'll just use branchId if available
    const pendingOrders = await this.posOrderModel.find(filter).sort({ createdAt: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFilter = { ...filter, createdAt: { $gte: today } };
    const settledToday = await this.posOrderModel.find({
      ...todayFilter,
      status: 'paid',
    });

    const totalDueAmount = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const settledTodayAmount = settledToday.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      pendingSettlements: pendingOrders.length,
      totalDueAmount,
      settledToday: settledToday.length,
      settledTodayAmount,
      pendingOrders: pendingOrders.map((order: any) => ({
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount || 0,
        orderType: order.orderType,
        createdAt: order.createdAt,
        tableId: order.tableId?.toString(),
        customerInfo: order.customerInfo,
      })),
    };
  }
}

