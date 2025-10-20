import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderFilterDto } from '../../common/dto/pagination.dto';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { TablesService } from '../tables/tables.service';
import { AddPaymentDto } from './dto/add-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private tablesService: TablesService,
    private menuItemsService: MenuItemsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Generate unique order number
    const orderNumber = await this.generateOrderNumber(
      createOrderDto.branchId,
    );

    // Calculate pricing for each item
    const items = await Promise.all(
      createOrderDto.items.map(async (item) => {
        const menuItem = await this.menuItemsService.findOne(
          item.menuItemId.toString(),
        );

        let unitPrice = menuItem.price;

        // Add variant price modifier
        if (item.selectedVariant) {
          const variant = menuItem.variants?.find(
            (v) => v.name === item.selectedVariant.name,
          );
          if (variant) {
            // @ts-ignore - Mongoose schema field
            unitPrice += variant.priceModifier || 0;
          }
        }

        // Add addons price
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          const addonsTotal = item.selectedAddons.reduce(
            (sum, addon) => sum + (addon.price || 0),
            0,
          );
          unitPrice += addonsTotal;
        }

        const totalPrice = unitPrice * item.quantity;

        return {
          menuItemId: new Types.ObjectId(item.menuItemId),
          name: menuItem.name,
          quantity: item.quantity,
          basePrice: menuItem.price,
          selectedVariant: item.selectedVariant,
          selectedAddons: item.selectedAddons,
          specialInstructions: item.specialInstructions,
          unitPrice,
          totalPrice,
          status: 'pending',
        };
      }),
    );

    // Calculate order totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const taxRate = createOrderDto.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;

    const serviceChargeRate = createOrderDto.serviceChargeRate || 0;
    const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;

    const discountAmount = createOrderDto.discountAmount || 0;
    const deliveryFee = createOrderDto.deliveryFee || 0;

    const total =
      subtotal +
      taxAmount +
      serviceChargeAmount +
      deliveryFee -
      discountAmount;

    // Create order
    const order = new this.orderModel({
      ...createOrderDto,
      orderNumber,
      items,
      subtotal,
      taxRate,
      taxAmount,
      serviceChargeRate,
      serviceChargeAmount,
      discountAmount,
      deliveryFee,
      total,
      remainingAmount: total,
      status: 'pending',
      paymentStatus: 'pending',
    });

    const savedOrder = await order.save();

    // Update table status if dine-in
    if (createOrderDto.tableId && createOrderDto.type === 'dine-in') {
      await this.tablesService.updateStatus(
        createOrderDto.tableId.toString(),
        {
          status: 'occupied',
          orderId: savedOrder._id.toString(),
          occupiedBy: createOrderDto.waiterId.toString(),
        },
      );
    }

    // Increment menu item order counts
    for (const item of items) {
      await this.menuItemsService.incrementOrders(
        item.menuItemId.toString(),
        item.totalPrice,
      );
    }

    return this.findOne(savedOrder._id.toString());
  }

  async findAll(filterDto: OrderFilterDto): Promise<{ orders: Order[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const query: any = { ...filters };

    // Add date range filtering
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'waiter.firstName': { $regex: search, $options: 'i' } },
        { 'waiter.lastName': { $regex: search, $options: 'i' } },
        { 'table.tableNumber': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await this.orderModel
      .find(query)
      .populate('tableId', 'tableNumber location')
      .populate('customerId', 'firstName lastName phone')
      .populate('waiterId', 'firstName lastName')
      .populate('items.menuItemId', 'name image category')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.orderModel.countDocuments(query);

    return {
      orders,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('branchId', 'name code')
      .populate('tableId', 'tableNumber location capacity')
      .populate('customerId', 'firstName lastName phone email')
      .populate('waiterId', 'firstName lastName employeeId')
      .populate('items.menuItemId', 'name image categoryId')
      .populate('payments.processedBy', 'firstName lastName');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByTable(tableId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        tableId: new Types.ObjectId(tableId),
        status: { $nin: ['completed', 'cancelled'] },
      })
      .populate('waiterId', 'firstName lastName')
      .populate('items.menuItemId', 'name image')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByBranch(
    branchId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Order[]> {
    const filter: any = {
      branchId: new Types.ObjectId(branchId),
    };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    return this.orderModel
      .find(filter)
      .populate('tableId', 'tableNumber')
      .populate('waiterId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findActiveOrders(branchId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: { $nin: ['completed', 'cancelled'] },
      })
      .populate('tableId', 'tableNumber location')
      .populate('waiterId', 'firstName lastName')
      .sort({ createdAt: 1 })
      .exec();
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      updateOrderDto,
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Handle status-specific updates
    if (updateStatusDto.status === 'confirmed') {
      updateData.confirmedAt = new Date();
      updateData['items.$[].sentToKitchenAt'] = new Date();
      updateData['items.$[].status'] = 'preparing';
    } else if (updateStatusDto.status === 'completed') {
      updateData.completedAt = new Date();
      updateData.paymentStatus = 'paid';

      // Free up table if dine-in
      if (order.tableId) {
        await this.tablesService.updateStatus(order.tableId.toString(), {
          status: 'cleaning',
        });
      }
    } else if (updateStatusDto.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = updateStatusDto.reason;

      // Free up table if occupied
      if (order.tableId) {
        await this.tablesService.updateStatus(order.tableId.toString(), {
          status: 'available',
        });
      }
    }

    await this.orderModel.findByIdAndUpdate(id, updateData);

    return this.findOne(id);
  }

  async addPayment(id: string, addPaymentDto: AddPaymentDto): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already fully paid');
    }

    // Add payment
    const payment = {
      method: addPaymentDto.method,
      amount: addPaymentDto.amount,
      transactionId: addPaymentDto.transactionId,
      paidAt: new Date(),
      processedBy: new Types.ObjectId(addPaymentDto.processedBy),
    };

    order.payments.push(payment);
    order.paidAmount += addPaymentDto.amount;
    order.remainingAmount = order.total - order.paidAmount;

    // Update payment status
    if (order.remainingAmount <= 0) {
      order.paymentStatus = 'paid';
      order.remainingAmount = 0;
    } else if (order.paidAmount > 0) {
      order.paymentStatus = 'partial';
    }

    await order.save();

    return this.findOne(id);
  }

  async splitOrder(id: string, splitData: any): Promise<Order[]> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const parentOrder = await this.orderModel.findById(id);

    if (!parentOrder) {
      throw new NotFoundException('Order not found');
    }

    if (parentOrder.isSplit) {
      throw new BadRequestException('Order is already split');
    }

    const splitOrders: Order[] = [];

    // Create split orders
    for (const split of splitData.splits) {
      const splitItems = split.itemIndices.map((index: number) => ({
        ...parentOrder.items[index],
        quantity: split.quantities?.[index] || parentOrder.items[index].quantity,
      }));

      const splitSubtotal = splitItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );

      const splitOrder = new this.orderModel({
        companyId: parentOrder.companyId,
        branchId: parentOrder.branchId,
        orderNumber: `${parentOrder.orderNumber}-${splitOrders.length + 1}`,
        type: parentOrder.type,
        tableId: parentOrder.tableId,
        waiterId: parentOrder.waiterId,
        items: splitItems,
        subtotal: splitSubtotal,
        taxRate: parentOrder.taxRate,
        taxAmount: (splitSubtotal * parentOrder.taxRate) / 100,
        total:
          splitSubtotal + (splitSubtotal * parentOrder.taxRate) / 100,
        remainingAmount:
          splitSubtotal + (splitSubtotal * parentOrder.taxRate) / 100,
        status: parentOrder.status,
        paymentStatus: 'pending',
        isSplit: true,
        parentOrderId: parentOrder._id,
      });

      splitOrders.push(await splitOrder.save());
    }

    // Update parent order
    parentOrder.isSplit = true;
    // @ts-ignore - Mongoose document _id
    parentOrder.splitOrderIds = splitOrders.map((o) => o._id);
    await parentOrder.save();

    return splitOrders;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending' && order.status !== 'cancelled') {
      throw new BadRequestException(
        'Can only delete pending or cancelled orders',
      );
    }

    await this.orderModel.findByIdAndDelete(id);
  }

  async getSalesStats(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.orderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    });

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      averageOrderValue:
        orders.length > 0
          ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
          : 0,
      totalTax: orders.reduce((sum, o) => sum + o.taxAmount, 0),
      totalDiscount: orders.reduce((sum, o) => sum + o.discountAmount, 0),
      ordersByType: {
        dineIn: orders.filter((o) => o.type === 'dine-in').length,
        takeaway: orders.filter((o) => o.type === 'takeaway').length,
        delivery: orders.filter((o) => o.type === 'delivery').length,
      },
      paymentMethods: {},
    };

    // Calculate payment method breakdown
    orders.forEach((order) => {
      order.payments.forEach((payment) => {
        if (!stats.paymentMethods[payment.method]) {
          stats.paymentMethods[payment.method] = 0;
        }
        stats.paymentMethods[payment.method] += payment.amount;
      });
    });

    return stats;
  }

  async getDailySeries(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; orders: number; revenue: number }[]> {
    const series = await this.orderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: '$completedAt' },
            m: { $month: '$completedAt' },
            d: { $dayOfMonth: '$completedAt' },
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    return series.map((s) => ({
      date: `${s._id.y}-${String(s._id.m).padStart(2, '0')}-${String(s._id.d).padStart(2, '0')}`,
      orders: s.orders,
      revenue: s.revenue,
    }));
  }

  async getTopProducts(
    branchId: string,
    startDate: Date,
    endDate: Date,
    limit = 5,
  ): Promise<{ menuItemId: string; name: string; sales: number; revenue: number }[]> {
    const rows = await this.orderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          sales: { $sum: { $ifNull: ['$items.quantity', 1] } },
          revenue: {
            $sum: {
              $ifNull: [
                '$items.total',
                { $multiply: [{ $ifNull: ['$items.quantity', 1] }, { $ifNull: ['$items.price', 0] }] },
              ],
            },
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'menuitems', // collection name
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          menuItemId: { $toString: '$_id' },
          name: { $ifNull: ['$menuItem.name', 'Unknown Item'] },
          sales: 1,
          revenue: 1,
        },
      },
    ]);

    return rows;
  }

  async getTopEmployees(
    branchId: string,
    startDate: Date,
    endDate: Date,
    limit = 4,
  ): Promise<{ userId: string; name: string; role: string; orders: number }[]> {
    const rows = await this.orderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$waiterId',
          orders: { $sum: 1 },
        },
      },
      { $sort: { orders: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: { $toString: '$_id' },
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$user.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.lastName', ''] },
                ],
              },
            },
          },
          role: { $ifNull: ['$user.role', 'STAFF'] },
          orders: 1,
        },
      },
    ]);

    return rows;
  }

  private async generateOrderNumber(branchId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

    // Count orders today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const todayOrdersCount = await this.orderModel.countDocuments({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = String(todayOrdersCount + 1).padStart(4, '0');

    return `ORD-${dateStr}-${sequence}`;
  }
}

