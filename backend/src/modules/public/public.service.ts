import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { CustomersService } from '../customers/customers.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../orders/schemas/order.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<any>,
    private ordersService: OrdersService,
    private customersService: CustomersService,
    private menuItemsService: MenuItemsService,
    private zonesService: DeliveryZonesService,
    private usersService: UsersService,
  ) {}

  async createOrder(orderData: any) {
    try {
      // Find or create customer
      let customerId = null;
      if (orderData.customer && (orderData.customer.email || orderData.customer.phone)) {
        try {
          const customer = await this.customersService.findOrCreate({
            companyId: orderData.companyId,
            firstName: orderData.customer.firstName,
            lastName: orderData.customer.lastName,
            email: orderData.customer.email,
            phone: orderData.customer.phone,
          });
          customerId = (customer as any).id || (customer as any)._id?.toString();
        } catch (error) {
          // If customer creation fails, continue without customer ID
          console.error('Customer creation failed:', error);
        }
      }

      // Prepare order items with pricing
      const items = await Promise.all(
        orderData.items.map(async (item: any) => {
          const menuItem = await this.menuItemsService.findOne(item.menuItemId);
          
          let unitPrice = item.price || menuItem.price;
          const totalPrice = unitPrice * item.quantity;

          return {
            menuItemId: new Types.ObjectId(item.menuItemId),
            name: item.name || menuItem.name,
            quantity: item.quantity,
            basePrice: menuItem.price,
            unitPrice,
            totalPrice,
            status: 'pending',
          };
        }),
      );

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 10; // 10% tax
      const taxAmount = (subtotal * taxRate) / 100;
      
      // Calculate delivery fee based on zone
      let deliveryFee = 0;
      let deliveryZoneId = null;
      
      if (orderData.deliveryType === 'delivery' && orderData.deliveryAddress) {
        const zone = await this.zonesService.findZoneByAddress(
          orderData.companyId,
          orderData.branchId,
          orderData.deliveryAddress,
        );
        
        if (zone) {
          deliveryZoneId = (zone as any).id || (zone as any)._id?.toString();
          deliveryFee = zone.deliveryCharge || 0;
          
          // Check if free delivery applies (order above minimum)
          if (zone.freeDeliveryAbove && subtotal >= zone.freeDeliveryAbove) {
            deliveryFee = 0;
          }
          
          // Check minimum order amount
          if (zone.minimumOrderAmount && subtotal < zone.minimumOrderAmount) {
            throw new BadRequestException(
              `Minimum order amount for this zone is ${zone.minimumOrderAmount}`,
            );
          }
        } else {
          // Fallback: use default fee if no zone found
          deliveryFee = 50;
        }
      }
      
      const total = subtotal + taxAmount + deliveryFee;

      // Get default waiter for the branch (owner or first user)
      let waiterId = orderData.branchId; // Fallback to branchId as ObjectId
      try {
        const branchUsers = await this.usersService.findByBranch(orderData.branchId);
        if (branchUsers && branchUsers.length > 0) {
          const owner = branchUsers.find((u: any) => u.role === 'owner');
          waiterId = ((owner || branchUsers[0]) as any).id || ((owner || branchUsers[0]) as any)._id?.toString() || orderData.branchId;
        }
      } catch (error) {
        // Use branchId as fallback
        console.error('Could not find waiter, using fallback:', error);
      }

      // Generate order number
      const orderNumber = GeneratorUtil.generateOrderNumber('PUB');

      // Create order
      const order = new this.orderModel({
        companyId: new Types.ObjectId(orderData.companyId),
        branchId: new Types.ObjectId(orderData.branchId),
        orderNumber,
        type: orderData.deliveryType || 'delivery',
        customerId: customerId ? new Types.ObjectId(customerId) : undefined,
        waiterId: new Types.ObjectId(waiterId),
        items,
        subtotal,
        taxRate,
        taxAmount,
        deliveryFee,
        deliveryZoneId: deliveryZoneId ? new Types.ObjectId(deliveryZoneId) : undefined,
        total,
        remainingAmount: total,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: orderData.paymentMethod || 'cash',
        deliveryAddress: orderData.deliveryAddress,
        specialInstructions: orderData.specialInstructions,
        notes: orderData.specialInstructions,
      });

      const savedOrder = await order.save();

      return {
        success: true,
        data: {
          orderId: savedOrder._id.toString(),
          orderNumber: savedOrder.orderNumber,
          total: savedOrder.total,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to create order');
    }
  }

  async getReviews(branchId: string) {
    // TODO: Implement reviews system
    return {
      success: true,
      data: [],
    };
  }

  async getGallery(companyId: string) {
    // TODO: Implement gallery system
    return {
      success: true,
      data: [],
    };
  }

  async getOrderById(orderId: string) {
    try {
      const order = await this.orderModel
        .findById(orderId)
        .populate('companyId', 'name phone email')
        .populate('branchId', 'name address phone')
        .populate('customerId', 'firstName lastName phone email')
        .lean();

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      return {
        success: true,
        data: order,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to fetch order');
    }
  }
}

