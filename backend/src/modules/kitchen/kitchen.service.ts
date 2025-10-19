import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { KitchenOrder, KitchenOrderDocument } from './schemas/kitchen-order.schema';

@Injectable()
export class KitchenService {
  constructor(
    @InjectModel(KitchenOrder.name)
    private kitchenOrderModel: Model<KitchenOrderDocument>,
    private websocketsGateway: WebsocketsGateway,
  ) {}

  async createFromOrder(order: any): Promise<KitchenOrder> {
    // Create kitchen order from regular order
    const kitchenOrder = new this.kitchenOrderModel({
      orderId: order._id || order.id,
      branchId: order.branchId,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      tableNumber: order.tableId?.tableNumber,
      orderType: order.type,
      items: order.items.map((item: any, index: number) => ({
        itemId: `${order.orderNumber}-${index}`,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
        selectedAddons: item.selectedAddons,
        specialInstructions: item.specialInstructions,
        status: 'pending',
        priority: 0,
      })),
      status: 'pending',
      receivedAt: new Date(),
      customerName: order.guestName || order.customerId?.firstName,
      notes: order.customerNotes,
    });

    const saved = await kitchenOrder.save();

    // Notify kitchen via WebSocket
    this.websocketsGateway.notifyKitchenOrderReceived(
      order.branchId.toString(),
      saved,
    );

    return saved;
  }

  async findAll(branchId: string, status?: string): Promise<KitchenOrder[]> {
    const filter: any = {
      branchId: new Types.ObjectId(branchId),
    };

    if (status) {
      filter.status = status;
    } else {
      // Default to active orders only
      filter.status = { $nin: ['completed', 'cancelled'] };
    }

    return this.kitchenOrderModel
      .find(filter)
      .populate('tableId', 'tableNumber location')
      .populate('items.menuItemId', 'name categoryId')
      .populate('items.preparedBy', 'firstName lastName')
      .sort({ receivedAt: 1 }) // Oldest first
      .exec();
  }

  async findOne(id: string): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel
      .findById(id)
      .populate('tableId', 'tableNumber location capacity')
      .populate('items.menuItemId', 'name image categoryId')
      .populate('items.preparedBy', 'firstName lastName');

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    return order;
  }

  async findByOrderId(orderId: string): Promise<KitchenOrder> {
    const order = await this.kitchenOrderModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .populate('tableId', 'tableNumber')
      .populate('items.preparedBy', 'firstName lastName');

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    return order;
  }

  async findPending(branchId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'pending',
      })
      .populate('tableId', 'tableNumber')
      .sort({ receivedAt: 1 })
      .exec();
  }

  async findPreparing(branchId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'preparing',
      })
      .populate('tableId', 'tableNumber')
      .sort({ startedAt: 1 })
      .exec();
  }

  async findReady(branchId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'ready',
      })
      .populate('tableId', 'tableNumber')
      .sort({ completedAt: 1 })
      .exec();
  }

  async findDelayed(branchId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        isDelayed: true,
        status: { $nin: ['completed', 'cancelled'] },
      })
      .populate('tableId', 'tableNumber')
      .sort({ receivedAt: 1 })
      .exec();
  }

  async findUrgent(branchId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderModel
      .find({
        branchId: new Types.ObjectId(branchId),
        isUrgent: true,
        status: { $nin: ['completed', 'cancelled'] },
      })
      .populate('tableId', 'tableNumber')
      .sort({ receivedAt: 1 })
      .exec();
  }

  async startOrder(id: string, chefId: string): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not pending');
    }

    order.status = 'preparing';
    order.startedAt = new Date();

    // Mark all items as preparing
    order.items.forEach((item) => {
      if (item.status === 'pending') {
        item.status = 'preparing';
        item.startedAt = new Date();
        item.preparedBy = new Types.ObjectId(chefId);
      }
    });

    const saved = await order.save();

    // Notify via WebSocket
    this.websocketsGateway.notifyKitchenOrderReceived(
      order.branchId.toString(),
      saved,
    );

    return saved;
  }

  async startItem(
    id: string,
    itemId: string,
    chefId: string,
  ): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    const item = order.items.find((i) => i.itemId === itemId);

    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    if (item.status !== 'pending') {
      throw new BadRequestException('Item is not pending');
    }

    item.status = 'preparing';
    item.startedAt = new Date();
    item.preparedBy = new Types.ObjectId(chefId);

    // Update order status if needed
    if (order.status === 'pending') {
      order.status = 'preparing';
      order.startedAt = new Date();
    }

    const saved = await order.save();

    // Notify via WebSocket
    this.websocketsGateway.notifyKitchenItemStarted(
      order.branchId.toString(),
      order.orderId.toString(),
      itemId,
    );

    return saved;
  }

  async completeItem(id: string, itemId: string): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    const item = order.items.find((i) => i.itemId === itemId);

    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    if (item.status !== 'preparing') {
      throw new BadRequestException('Item is not being prepared');
    }

    item.status = 'ready';
    item.completedAt = new Date();

    // Check if all items are ready
    const allReady = order.items.every((i) => i.status === 'ready');

    if (allReady) {
      order.status = 'ready';
      order.completedAt = new Date();

      // Calculate actual time
      if (order.startedAt) {
        order.actualTime = Math.floor(
          (order.completedAt.getTime() - order.startedAt.getTime()) / 60000,
        );
      }
    }

    const saved = await order.save();

    // Notify via WebSocket
    this.websocketsGateway.notifyKitchenItemCompleted(
      order.branchId.toString(),
      order.orderId.toString(),
      itemId,
    );

    if (allReady) {
      this.websocketsGateway.notifyOrderStatusChanged(
        order.branchId.toString(),
        saved,
      );
    }

    return saved;
  }

  async completeOrder(id: string): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (order.status !== 'ready') {
      throw new BadRequestException('Order is not ready');
    }

    order.status = 'completed';

    // Calculate actual time if not set
    if (!order.actualTime && order.startedAt) {
      order.actualTime = Math.floor(
        (Date.now() - order.startedAt.getTime()) / 60000,
      );
    }

    const saved = await order.save();

    // Notify via WebSocket
    this.websocketsGateway.notifyOrderStatusChanged(
      order.branchId.toString(),
      saved,
    );

    return saved;
  }

  async markUrgent(id: string, isUrgent: boolean): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findByIdAndUpdate(
      id,
      { isUrgent },
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    // Notify via WebSocket
    if (isUrgent) {
      this.websocketsGateway.notifySystemAlert(order.branchId.toString(), {
        type: 'urgent_order',
        message: `Order ${order.orderNumber} marked as urgent`,
        orderId: order.id,
      });
    }

    return order;
  }

  async setPriority(
    id: string,
    itemId: string,
    priority: number,
  ): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    const item = order.items.find((i) => i.itemId === itemId);

    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    item.priority = priority;

    return order.save();
  }

  async cancelOrder(id: string, reason?: string): Promise<KitchenOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid kitchen order ID');
    }

    const order = await this.kitchenOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Kitchen order not found');
    }

    order.status = 'cancelled';
    if (reason) {
      order.notes = `Cancelled: ${reason}`;
    }

    const saved = await order.save();

    // Notify via WebSocket
    this.websocketsGateway.notifyOrderStatusChanged(
      order.branchId.toString(),
      saved,
    );

    return saved;
  }

  async getStats(branchId: string): Promise<any> {
    const orders = await this.kitchenOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      status: { $nin: ['completed', 'cancelled'] },
    });

    const completedToday = await this.kitchenOrderModel.countDocuments({
      branchId: new Types.ObjectId(branchId),
      status: 'completed',
      completedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    const averageTime = await this.kitchenOrderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          status: 'completed',
          actualTime: { $exists: true, $ne: null },
          completedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$actualTime' },
        },
      },
    ]);

    return {
      pending: orders.filter((o) => o.status === 'pending').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      delayed: orders.filter((o) => o.isDelayed).length,
      urgent: orders.filter((o) => o.isUrgent).length,
      completedToday,
      averageTime: averageTime[0]?.avgTime || 0,
      total: orders.length,
    };
  }
}

