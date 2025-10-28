import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { CreatePOSOrderDto } from './dto/create-pos-order.dto';
import { POSOrderFiltersDto, POSStatsFiltersDto } from './dto/pos-filters.dto';
import { UpdatePOSSettingsDto } from './dto/pos-settings.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { UpdatePOSOrderDto } from './dto/update-pos-order.dto';
import { ReceiptService } from './receipt.service';
import { POSOrder, POSOrderDocument } from './schemas/pos-order.schema';
import { POSPayment, POSPaymentDocument } from './schemas/pos-payment.schema';
import { POSSettings, POSSettingsDocument } from './schemas/pos-settings.schema';

@Injectable()
export class POSService {
  constructor(
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(POSPayment.name) private posPaymentModel: Model<POSPaymentDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    private receiptService: ReceiptService,
    private menuItemsService: MenuItemsService,
  ) {}

  // Generate unique order number
  private async generateOrderNumber(branchId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const branchCode = branchId.slice(-4).toUpperCase();
    
    const lastOrder = await this.posOrderModel
      .findOne({ branchId: new Types.ObjectId(branchId) })
      .sort({ createdAt: -1 })
      .exec();

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber.includes(dateStr)) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]) || 0;
      sequence = lastSequence + 1;
    }

    return `POS-${branchCode}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  // Create POS order
  async createOrder(createOrderDto: CreatePOSOrderDto, userId: string, branchId: string): Promise<POSOrder> {
    const orderNumber = await this.generateOrderNumber(branchId);

    const orderData = {
      ...createOrderDto,
      orderNumber,
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      tableId: new Types.ObjectId(createOrderDto.tableId),
      items: createOrderDto.items.map(item => ({
        ...item,
        menuItemId: new Types.ObjectId(item.menuItemId),
      })),
    };

    const order = new this.posOrderModel(orderData);
    return order.save();
  }

  // Get POS orders with filters
  async getOrders(filters: POSOrderFiltersDto): Promise<{ orders: POSOrder[]; total: number }> {
    const query: any = {};

    if (filters.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    if (filters.search) {
      query.$or = [
        { orderNumber: { $regex: filters.search, $options: 'i' } },
        { 'customerInfo.name': { $regex: filters.search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.posOrderModel
        .find(query)
        .populate('tableId', 'number capacity')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.posOrderModel.countDocuments(query).exec(),
    ]);

    return { orders, total };
  }

  // Get single POS order
  async getOrderById(id: string): Promise<POSOrder> {
    const order = await this.posOrderModel
      .findById(id)
      .populate('tableId', 'number capacity')
      .populate('userId', 'name email')
      .populate('paymentId')
      .exec();

    if (!order) {
      throw new NotFoundException('POS order not found');
    }

    return order;
  }

  // Update POS order
  async updateOrder(id: string, updateOrderDto: UpdatePOSOrderDto, userId: string): Promise<POSOrder> {
    const order = await this.posOrderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('POS order not found');
    }

    if (order.status === 'paid' && updateOrderDto.status === 'cancelled') {
      throw new ConflictException('Cannot cancel a paid order');
    }

    const updateData: any = { ...updateOrderDto };
    
    if (updateOrderDto.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = new Types.ObjectId(userId);
    }

    if (updateOrderDto.status === 'paid') {
      updateData.completedAt = new Date();
    }

    return this.posOrderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // Cancel POS order
  async cancelOrder(id: string, reason: string, userId: string): Promise<POSOrder> {
    const order = await this.posOrderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('POS order not found');
    }

    if (order.status === 'paid') {
      throw new ConflictException('Cannot cancel a paid order');
    }

    return this.posOrderModel.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: new Types.ObjectId(userId),
        cancellationReason: reason,
      },
      { new: true }
    ).exec();
  }

  // Process payment
  async processPayment(processPaymentDto: ProcessPaymentDto, userId: string, branchId: string): Promise<POSPayment> {
    const order = await this.posOrderModel.findById(processPaymentDto.orderId).exec();
    if (!order) {
      throw new NotFoundException('POS order not found');
    }

    if (order.status === 'paid') {
      throw new ConflictException('Order is already paid');
    }

    if (Math.abs(order.totalAmount - processPaymentDto.amount) > 0.01) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    const paymentData = {
      orderId: new Types.ObjectId(processPaymentDto.orderId),
      amount: processPaymentDto.amount,
      method: processPaymentDto.method,
      status: 'completed',
      transactionId: processPaymentDto.transactionId,
      referenceNumber: processPaymentDto.referenceNumber,
      processedBy: new Types.ObjectId(userId),
      processedAt: new Date(),
      branchId: new Types.ObjectId(branchId),
      paymentDetails: {
        cardLast4: processPaymentDto.cardLast4,
        cardType: processPaymentDto.cardType,
        authorizationCode: processPaymentDto.authorizationCode,
      },
    };

    const payment = new this.posPaymentModel(paymentData);
    const savedPayment = await payment.save();

    // Update order status
    await this.posOrderModel.findByIdAndUpdate(processPaymentDto.orderId, {
      status: 'paid',
      paymentId: savedPayment._id,
      completedAt: new Date(),
    }).exec();

    return savedPayment;
  }

  // Get POS statistics
  async getStats(filters: POSStatsFiltersDto): Promise<any> {
    const matchQuery: any = {};

    if (filters.branchId) {
      matchQuery.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.startDate || filters.endDate) {
      matchQuery.createdAt = {};
      if (filters.startDate) {
        matchQuery.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchQuery.createdAt.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMatchQuery = {
      ...matchQuery,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    };

    const [
      totalOrders,
      totalRevenue,
      ordersToday,
      revenueToday,
      topSellingItems,
    ] = await Promise.all([
      this.posOrderModel.countDocuments(matchQuery).exec(),
      this.posOrderModel.aggregate([
        { $match: { ...matchQuery, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.posOrderModel.countDocuments(todayMatchQuery).exec(),
      this.posOrderModel.aggregate([
        { $match: { ...todayMatchQuery, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.posOrderModel.aggregate([
        { $match: { ...matchQuery, status: 'paid' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItemId',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'menuitems',
            localField: '_id',
            foreignField: '_id',
            as: 'menuItem',
          },
        },
        { $unwind: '$menuItem' },
        {
          $project: {
            menuItemId: '$_id',
            name: '$menuItem.name',
            quantity: 1,
            revenue: 1,
          },
        },
      ]).exec(),
    ]);

    const totalRevenueAmount = totalRevenue[0]?.total || 0;
    const revenueTodayAmount = revenueToday[0]?.total || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenueAmount / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue: totalRevenueAmount,
      averageOrderValue,
      ordersToday,
      revenueToday: revenueTodayAmount,
      topSellingItems,
    };
  }


  // Get quick stats
  async getQuickStats(branchId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeOrders,
      availableTables,
      totalRevenue,
      ordersInProgress,
    ] = await Promise.all([
      this.posOrderModel.countDocuments({
        branchId: new Types.ObjectId(branchId),
        status: { $in: ['pending', 'paid'] },
      }).exec(),
      this.getAvailableTables(branchId).then(tables => 
        tables.filter(table => table.status === 'available').length
      ),
      this.posOrderModel.aggregate([
        { $match: { branchId: new Types.ObjectId(branchId), status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.posOrderModel.countDocuments({
        branchId: new Types.ObjectId(branchId),
        status: 'pending',
      }).exec(),
    ]);

    return {
      activeOrders,
      availableTables,
      totalRevenue: totalRevenue[0]?.total || 0,
      ordersInProgress,
    };
  }

  // POS Settings methods
  async getPOSSettings(branchId: string): Promise<POSSettings> {
    let settings = await this.posSettingsModel.findOne({ branchId: new Types.ObjectId(branchId) }).exec();
    
    if (!settings) {
      // Create default settings
      settings = new this.posSettingsModel({
        branchId: new Types.ObjectId(branchId),
        taxRate: 10,
        serviceCharge: 0,
        currency: 'USD',
        receiptSettings: {
          header: 'Welcome to Our Restaurant',
          footer: 'Thank you for your visit!',
          showLogo: true,
        },
        printerSettings: {
          enabled: false,
          printerId: '',
          autoPrint: false,
        },
      });
      await settings.save();
    }

    return settings;
  }

  async updatePOSSettings(branchId: string, updateSettingsDto: UpdatePOSSettingsDto, userId: string): Promise<POSSettings> {
    const settings = await this.posSettingsModel.findOneAndUpdate(
      { branchId: new Types.ObjectId(branchId) },
      {
        ...updateSettingsDto,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true, upsert: true }
    ).exec();

    return settings;
  }

  // Print receipt
  async printReceipt(orderId: string, printerId?: string): Promise<{ receiptUrl: string; printResult?: any }> {
    const order = await this.getOrderById(orderId);
    
    // Generate receipt HTML
    const receiptHtml = await this.receiptService.generateReceiptHTML(orderId);
    
    // Generate receipt URL (in real implementation, this would generate a PDF)
    const receiptUrl = `/api/pos/receipts/${orderId}.html`;
    
    // Try to print if printer is specified
    let printResult;
    if (printerId) {
      printResult = await this.receiptService.printReceipt(orderId, printerId);
    }
    
    return { 
      receiptUrl,
      printResult
    };
  }

  // Split order into multiple orders
  async splitOrder(orderId: string, itemsToSplit: any[], userId: string, branchId: string): Promise<{ order1: POSOrder; order2: POSOrder }> {
    const originalOrder = await this.getOrderById(orderId);
    
    if (originalOrder.status === 'paid') {
      throw new ConflictException('Cannot split a paid order');
    }

    // Calculate remaining items
    const remainingItems = originalOrder.items.filter(
      item => !itemsToSplit.some(splitItem => splitItem.menuItemId === item.menuItemId.toString())
    );

    if (remainingItems.length === 0) {
      throw new BadRequestException('Cannot split order - no items remaining in original order');
    }

    if (itemsToSplit.length === 0) {
      throw new BadRequestException('Cannot split order - no items selected to split');
    }

    // Calculate totals
    const splitTotal = itemsToSplit.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const remainingTotal = remainingItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    // Create new order for split items
    const splitOrderData = {
      tableId: originalOrder.tableId.toString(),
      items: itemsToSplit,
      customerInfo: originalOrder.customerInfo,
      totalAmount: splitTotal,
      status: 'pending' as const,
      paymentMethod: originalOrder.paymentMethod,
      notes: `Split from order ${originalOrder.orderNumber}`,
    };

    const newOrder = await this.createOrder(splitOrderData, userId, branchId);

    // Update original order with remaining items
    const updateData = {
      items: remainingItems.map(item => ({
        menuItemId: item.menuItemId.toString(),
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      })),
      totalAmount: remainingTotal,
      notes: originalOrder.notes ? `${originalOrder.notes} (Split - remaining items)` : 'Split - remaining items',
    };

    const updatedOrder = await this.updateOrder(orderId, updateData, userId);

    return {
      order1: updatedOrder,
      order2: newOrder,
    };
  }

  // Process refund for an order
  async processRefund(orderId: string, amount: number, reason: string, userId: string, branchId: string): Promise<POSPayment> {
    const order = await this.getOrderById(orderId);
    
    if (order.status !== 'paid') {
      throw new BadRequestException('Can only refund paid orders');
    }

    if (amount > order.totalAmount) {
      throw new BadRequestException('Refund amount cannot exceed order total');
    }

    // Create refund payment record
    const refundData = {
      orderId: new Types.ObjectId(orderId),
      amount: -amount, // Negative amount for refund
      method: 'refund',
      status: 'completed',
      transactionId: `REF-${Date.now()}`,
      referenceNumber: `REF-${order.orderNumber}`,
      processedBy: new Types.ObjectId(userId),
      processedAt: new Date(),
      branchId: new Types.ObjectId(branchId),
      paymentDetails: {
        refundReason: reason,
        originalOrderId: orderId,
      },
    };

    const refund = new this.posPaymentModel(refundData);
    const savedRefund = await refund.save();

    // Update order status if full refund
    if (amount === order.totalAmount) {
      await this.posOrderModel.findByIdAndUpdate(orderId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: new Types.ObjectId(userId),
        cancellationReason: `Full refund: ${reason}`,
      }).exec();
    }

    return savedRefund;
  }

  // Get order history for a specific table
  async getTableOrderHistory(tableId: string, limit: number = 10): Promise<POSOrder[]> {
    return this.posOrderModel
      .find({ tableId: new Types.ObjectId(tableId) })
      .populate('tableId', 'number capacity')
      .populate('userId', 'name email')
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Get available tables (integrate with real table service)
  async getAvailableTables(branchId: string): Promise<any[]> {
    // This should integrate with the TablesModule
    // For now, we'll create a more realistic implementation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active orders for today
    const activeOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'paid'] },
    }).select('tableId').exec();

    const occupiedTableIds = activeOrders.map(order => order.tableId.toString());

    // Mock table data - in real implementation, this would come from TablesModule
    const allTables = [
      { id: '1', number: '1', capacity: 4, status: 'available' },
      { id: '2', number: '2', capacity: 2, status: 'available' },
      { id: '3', number: '3', capacity: 6, status: 'available' },
      { id: '4', number: '4', capacity: 4, status: 'available' },
      { id: '5', number: '5', capacity: 8, status: 'available' },
      { id: '6', number: '6', capacity: 2, status: 'available' },
    ];

    return allTables.map(table => ({
      ...table,
      status: occupiedTableIds.includes(table.id) ? 'occupied' : 'available',
      currentOrderId: occupiedTableIds.includes(table.id) ? 
        activeOrders.find(order => order.tableId.toString() === table.id)?._id : undefined,
    }));
  }

  // Get POS menu items (integrate with real menu service)
  async getPOSMenuItems(filters: any): Promise<any[]> {
    try {
      // Build query filters - pass as strings, not ObjectIds
      const queryFilters: any = {
        branchId: filters.branchId ? filters.branchId.toString() : undefined,
        categoryId: filters.categoryId ? filters.categoryId.toString() : undefined,
        search: filters.search,
        isAvailable: filters.isAvailable !== undefined ? filters.isAvailable : true,
        page: 1,
        limit: 1000, // Get all items for POS
      };

      // Remove undefined values
      Object.keys(queryFilters).forEach(key => {
        if (queryFilters[key] === undefined) {
          delete queryFilters[key];
        }
      });

      console.log('🔍 POS Menu Items Query Filters:', queryFilters);

      // Fetch menu items from database
      const result = await this.menuItemsService.findAll(queryFilters);
      
      console.log(`✅ Found ${result.menuItems.length} menu items`);
      
      // Transform to POS format
      return result.menuItems.map((item: any) => {
        const category = item.categoryId;
        const categoryId = category?._id?.toString() || category?.toString() || '';
        const categoryName = category?.name || 'Uncategorized';
        const firstImage = Array.isArray(item.images) && item.images.length > 0 
          ? item.images[0] 
          : undefined;

        // Calculate stock: if tracking inventory, calculate from ingredients; otherwise unlimited
        let stock = 999; // Default to unlimited stock
        if (item.trackInventory === true) {
          // If tracking inventory but no ingredients data, set to 0
          // In a full implementation, calculate from ingredient stock
          stock = Array.isArray(item.ingredients) && item.ingredients?.length > 0 ? 999 : 0;
        }
        
        // If item is not available, stock is 0
        if (item.isAvailable === false) {
          stock = 0;
        }

        return {
          id: (item._id || item.id).toString(),
          name: item.name,
          description: item.description,
          price: item.price,
          category: {
            id: categoryId,
            name: categoryName,
          },
          isAvailable: item.isAvailable !== false,
          image: firstImage,
          stock: stock,
        };
      });
    } catch (error) {
      console.error('Error fetching POS menu items:', error);
      return [];
    }
  }
}

