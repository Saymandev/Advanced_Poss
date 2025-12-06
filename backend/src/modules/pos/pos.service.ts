import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { CustomersService } from '../customers/customers.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { KitchenService } from '../kitchen/kitchen.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { TablesService } from '../tables/tables.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
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
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private receiptService: ReceiptService,
    private menuItemsService: MenuItemsService,
    private ingredientsService: IngredientsService,
    private websocketsGateway: WebsocketsGateway,
    private emailService: EmailService,
    private smsService: SmsService,
    @Inject(forwardRef(() => TablesService))
    private tablesService: TablesService,
    @Inject(forwardRef(() => KitchenService))
    private kitchenService: KitchenService,
    @Inject(forwardRef(() => CustomersService))
    private customersService: CustomersService,
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
      const parts = lastOrder.orderNumber.split('-');
      const lastSequence = parts.length >= 4 ? parseInt(parts[3], 10) || 0 : 0;
      sequence = lastSequence + 1;
    }

    return `POS-${branchCode}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  // Create POS order
  async createOrder(createOrderDto: CreatePOSOrderDto, userId: string, branchId: string, companyId?: string, userBranchId?: string): Promise<POSOrder> {
    // Validate the user creating the order is assigned to the branch (owners can work across branches)
    const creatingUser = await this.userModel.findById(userId).select('role branchId companyId');
    if (!creatingUser) {
      throw new NotFoundException('User not found');
    }
    
    const creatingUserBranchId = creatingUser.branchId?.toString();
    const orderBranchId = branchId.toString();
    
    // Owners can create orders for any branch in their company, but other roles must be assigned to the branch
    if (creatingUser.role !== 'owner' && creatingUserBranchId !== orderBranchId) {
      throw new BadRequestException(`You are not assigned to branch ${orderBranchId}. Please assign yourself to this branch first.`);
    }
    
    // Validate waiter/employee assignment if waiterId is provided
    if (createOrderDto.waiterId && createOrderDto.waiterId !== userId) {
      const waiter = await this.userModel.findById(createOrderDto.waiterId).select('role branchId firstName lastName');
      if (!waiter) {
        throw new NotFoundException('Selected waiter/employee not found');
      }
      
      const waiterBranchId = waiter.branchId?.toString();
      if (waiterBranchId !== orderBranchId) {
        throw new BadRequestException(
          `${waiter.firstName} ${waiter.lastName} is not assigned to this branch. Please select an employee assigned to this branch.`
        );
      }
      
      // Validate waiter role - only waiters can be assigned as waiters
      const waiterRole = waiter.role.toLowerCase();
      if (waiterRole !== 'waiter' && waiterRole !== 'server') {
        throw new BadRequestException(
          `Selected employee (${waiter.role}) cannot be assigned as waiter. Only employees with "waiter" role can be assigned.`
        );
      }
    }

    // Validate payment mode: If pay-first mode is enabled, orders cannot be created as 'pending'
    const posSettings = await this.getPOSSettings(branchId);
    if (posSettings.defaultPaymentMode === 'pay-first' && createOrderDto.status === 'pending') {
      throw new BadRequestException(
        'Pay-first mode is enabled. Orders must be created as "paid". Please process payment before creating the order.'
      );
    }
    // Cache menu items to fetch names efficiently
    const menuItemCache = new Map<string, any>();
    
    // Fetch menu item names for all items
    const itemsWithNames = await Promise.all(
      createOrderDto.items.map(async (item) => {
        let menuItem = menuItemCache.get(item.menuItemId);
        if (!menuItem) {
          try {
            menuItem = await this.menuItemsService.findOne(item.menuItemId);
            if (menuItem) {
              menuItemCache.set(item.menuItemId, menuItem);
            }
          } catch (error) {
            console.error(`Failed to fetch menu item ${item.menuItemId}:`, error);
          }
        }
        
        return {
          menuItemId: new Types.ObjectId(item.menuItemId),
          name: menuItem?.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        };
      })
    );

    // Process loyalty points redemption if customerId is provided
    let loyaltyPointsRedeemed = 0;
    let loyaltyDiscount = 0;
    let customer = null;
    let finalOrderTotal = createOrderDto.totalAmount;

    if (createOrderDto.customerId && companyId) {
      try {
        customer = await this.customersService.findOne(createOrderDto.customerId);
        
        if (customer) {
          const MIN_ORDER_AMOUNT = 1000; // Minimum order amount in TK
          const POINTS_PER_DISCOUNT = 2000; // 2000 points = 20 TK discount
          const DISCOUNT_AMOUNT = 20; // 20 TK discount per 2000 points

          // Check if order meets minimum amount requirement
          if (createOrderDto.totalAmount >= MIN_ORDER_AMOUNT) {
            const availablePoints = customer.loyaltyPoints || 0;
            
            // Calculate how many discount blocks can be applied
            const discountBlocks = Math.floor(availablePoints / POINTS_PER_DISCOUNT);
            
            if (discountBlocks > 0) {
              // Apply maximum discount blocks (can be limited by order total)
              const maxDiscount = discountBlocks * DISCOUNT_AMOUNT;
              const orderSubtotal = createOrderDto.totalAmount;
              
              // Discount cannot exceed order total
              loyaltyDiscount = Math.min(maxDiscount, orderSubtotal);
              
              // Calculate points to redeem (in full blocks of 2000)
              const blocksToRedeem = Math.floor(loyaltyDiscount / DISCOUNT_AMOUNT);
              loyaltyPointsRedeemed = blocksToRedeem * POINTS_PER_DISCOUNT;
              
              // Update order total with discount
              finalOrderTotal = orderSubtotal - loyaltyDiscount;
              
              console.log(`💰 Loyalty redemption: ${loyaltyPointsRedeemed} points = ${loyaltyDiscount} TK discount`);
            }
          } else {
            console.log(`⚠️ Order amount ${createOrderDto.totalAmount} is below minimum ${MIN_ORDER_AMOUNT} TK for loyalty redemption`);
          }
        }
      } catch (error) {
        console.error('Error processing loyalty redemption:', error);
        // Don't fail order creation if loyalty processing fails
      }
    }

    const baseOrderData: any = {
      ...createOrderDto,
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      companyId: companyId ? new Types.ObjectId(companyId) : undefined,
      items: itemsWithNames,
      customerId: createOrderDto.customerId ? new Types.ObjectId(createOrderDto.customerId) : undefined,
      loyaltyPointsRedeemed,
      loyaltyDiscount,
      totalAmount: finalOrderTotal, // Use discounted amount if loyalty was applied
    };

    if (createOrderDto.tableId) {
      baseOrderData.tableId = new Types.ObjectId(createOrderDto.tableId);
      
      // Validate table capacity for dine-in orders
      if (createOrderDto.orderType === 'dine-in' && createOrderDto.guestCount) {
        const table = await this.tablesService.findOne(createOrderDto.tableId);
        if (!table) {
          throw new NotFoundException(`Table with ID ${createOrderDto.tableId} not found`);
        }
        
        // Get active orders for this table today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Only count PENDING orders for seat calculation (paid orders don't occupy seats)
        const existingOrders = await this.posOrderModel.find({
          tableId: new Types.ObjectId(createOrderDto.tableId),
          createdAt: { $gte: today, $lt: tomorrow },
          status: 'pending', // Only pending orders count towards seat usage
        }).exec();
        
        // Calculate used seats from PENDING orders only
        const usedSeats = existingOrders.reduce((sum, order) => {
          return sum + (order.guestCount || 0);
        }, 0);
        
        // Calculate remaining seats
        const remainingSeats = Math.max(0, (table.capacity || 0) - usedSeats);
        
        // Check if new order exceeds capacity
        if (createOrderDto.guestCount > remainingSeats) {
          throw new BadRequestException(
            `Cannot add ${createOrderDto.guestCount} guests. Table ${table.tableNumber} has only ${remainingSeats} seat(s) available (${usedSeats} already used out of ${table.capacity} total capacity).`
          );
        }
      }
    } else {
      delete baseOrderData.tableId;
    }

    if (createOrderDto.deliveryDetails) {
      baseOrderData.deliveryDetails = { ...createOrderDto.deliveryDetails };
    }

    if (createOrderDto.takeawayDetails) {
      baseOrderData.takeawayDetails = { ...createOrderDto.takeawayDetails };
    }

    // Include guestCount for dine-in orders (default to 1 if not provided)
    if (createOrderDto.orderType === 'dine-in') {
      baseOrderData.guestCount = createOrderDto.guestCount || 1;
    }

    const ingredientUsage = new Map<
      string,
      { quantity: number; name?: string; unit?: string }
    >();

    for (const item of createOrderDto.items) {
      const menuItemId = item.menuItemId;
      if (!menuItemId) {
        continue;
      }

      // menuItemCache is already populated above, so just get from cache
      const menuItem = menuItemCache.get(menuItemId);

      if (
        !menuItem ||
        menuItem.trackInventory !== true ||
        !Array.isArray(menuItem.ingredients) ||
        menuItem.ingredients.length === 0
      ) {
        continue;
      }

      for (const ingredient of menuItem.ingredients) {
        const rawIngredient = ingredient?.ingredientId as any;
        const ingredientObjectId: Types.ObjectId | undefined =
          rawIngredient?.id
            ? new Types.ObjectId(rawIngredient.id)
            : rawIngredient?._id
            ? new Types.ObjectId(rawIngredient._id)
            : rawIngredient instanceof Types.ObjectId
            ? rawIngredient
            : undefined;

        const ingredientId = ingredientObjectId
          ? ingredientObjectId.toString()
          : rawIngredient
          ? String(rawIngredient)
          : null;

        const baseQuantity = Number(ingredient?.quantity ?? 0);
        if (!ingredientId || Number.isNaN(baseQuantity) || baseQuantity <= 0) {
          continue;
        }

        const totalUsage = baseQuantity * item.quantity;
        if (totalUsage <= 0) {
          continue;
        }

        const existing = ingredientUsage.get(ingredientId) ?? {
          quantity: 0,
          name: rawIngredient?.name,
          unit: ingredient?.unit,
        };

        existing.quantity += totalUsage;
        if (!existing.name && rawIngredient?.name) {
          existing.name = rawIngredient.name;
        }
        if (!existing.unit && ingredient?.unit) {
          existing.unit = ingredient.unit;
        }

        ingredientUsage.set(ingredientId, existing);
      }
    }

    for (const [ingredientId, usage] of ingredientUsage.entries()) {
      const ingredient = await this.ingredientsService.findOne(ingredientId);

      if (ingredient.currentStock < usage.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ingredient ${
            usage.name || ingredient.name
          }. Required ${usage.quantity}${
            ingredient.unit ? ` ${ingredient.unit}` : ''
          }, available ${ingredient.currentStock}.`,
        );
      }

      ingredientUsage.set(ingredientId, {
        quantity: usage.quantity,
        name: ingredient.name,
        unit: ingredient.unit,
      });
    }

    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = await this.generateOrderNumber(branchId);
      const order = new this.posOrderModel({
        ...baseOrderData,
        orderNumber,
      });

      try {
        const savedOrder = await order.save();

        try {
          for (const [ingredientId, usage] of ingredientUsage.entries()) {
            await this.ingredientsService.removeStock(
              ingredientId,
              usage.quantity,
            );
          }
        } catch (inventoryError) {
          await this.posOrderModel.deleteOne({ _id: savedOrder._id });
          throw inventoryError;
        }

        // Update table status if dine-in order (only if order is pending - paid orders don't occupy tables)
        if (createOrderDto.tableId && createOrderDto.orderType === 'dine-in' && savedOrder.status === 'pending') {
          try {
            await this.tablesService.updateStatus(
              createOrderDto.tableId.toString(),
              {
                status: 'occupied',
                orderId: savedOrder._id.toString(),
                occupiedBy: userId,
              },
            );
          } catch (tableError) {
            // Log error but don't fail order creation
            console.error('Failed to update table status:', tableError);
          }
        } else if (createOrderDto.tableId && createOrderDto.orderType === 'dine-in' && savedOrder.status === 'paid') {
          // If order is paid first (pay-first mode), table should still be occupied
          // because the customer is using the table even though they paid upfront
          try {
            await this.tablesService.updateStatus(
              createOrderDto.tableId.toString(),
              {
                status: 'occupied',
                orderId: savedOrder._id.toString(),
                occupiedBy: userId,
              },
            );
            console.log(`✅ Table ${createOrderDto.tableId} occupied (order created as paid - customer using table)`);
          } catch (tableError) {
            console.error('Failed to update table status:', tableError);
          }
        }

        // If order is created as 'paid' (pay-first mode), create payment record immediately
        if (savedOrder.status === 'paid' && createOrderDto.paymentMethod) {
          try {
            const paymentData = {
              orderId: savedOrder._id,
              amount: savedOrder.totalAmount,
              method: createOrderDto.paymentMethod,
              status: 'completed',
              transactionId: `PAY-FIRST-${savedOrder.orderNumber}-${Date.now()}`,
              processedBy: new Types.ObjectId(userId),
              processedAt: new Date(),
              branchId: new Types.ObjectId(branchId),
              paymentDetails: {},
            };

            const payment = new this.posPaymentModel(paymentData);
            const savedPayment = await payment.save();

            // Link payment to order
            await this.posOrderModel.findByIdAndUpdate(savedOrder._id, {
              paymentId: savedPayment._id,
              completedAt: new Date(),
            }).exec();

            console.log(`✅ Payment record created for pay-first order ${savedOrder.orderNumber}`);
          } catch (paymentError) {
            // Log error but don't fail order creation
            console.error('Failed to create payment record for paid order:', paymentError);
          }
        }

        // Create kitchen order from POS order
        try {
          await this.createKitchenOrderFromPOS(savedOrder, menuItemCache);
        } catch (kitchenError) {
          // Log error but don't fail order creation
          console.error('Failed to create kitchen order:', kitchenError);
        }

        // Handle customer loyalty redemption and stats update if order is paid
        if (savedOrder.status === 'paid') {
          // If loyalty points were redeemed, deduct them from customer
          if (loyaltyPointsRedeemed > 0 && customer) {
            try {
              await this.customersService.redeemLoyaltyPoints(customer._id.toString(), loyaltyPointsRedeemed);
              console.log(`✅ Redeemed ${loyaltyPointsRedeemed} loyalty points from customer ${customer._id}`);
            } catch (error) {
              console.error('❌ Failed to redeem loyalty points:', error);
            }
          }

          // Update customer statistics
          if (createOrderDto.customerId && companyId) {
            try {
              const customerForStats = customer || await this.customersService.findOne(createOrderDto.customerId);
              if (customerForStats) {
                await this.customersService.updateOrderStats(customerForStats._id.toString(), savedOrder.totalAmount);
                console.log(`✅ Updated customer stats for customer ID: ${customerForStats._id}, amount: ${savedOrder.totalAmount}`);
              }
            } catch (customerError) {
              console.error('❌ Failed to update customer statistics:', customerError);
            }
          } else if (createOrderDto.customerInfo?.email && companyId) {
            try {
              console.log(`📧 Attempting to update customer stats for email: ${createOrderDto.customerInfo.email}, companyId: ${companyId}, orderAmount: ${savedOrder.totalAmount}`);
              const customerByEmail = await this.customersService.findByEmail(companyId, createOrderDto.customerInfo.email);
              if (customerByEmail) {
                const customerId = (customerByEmail as any)._id?.toString() || (customerByEmail as any).id?.toString();
                if (customerId) {
                  console.log(`💰 Updating customer stats for customer ID: ${customerId}, amount: ${savedOrder.totalAmount}`);
                  await this.customersService.updateOrderStats(customerId, savedOrder.totalAmount);
                  console.log(`✅ Successfully updated customer stats for ${customerByEmail.email}: +${savedOrder.totalAmount}`);
                }
              }
            } catch (customerError) {
              console.error('❌ Failed to update customer statistics:', customerError);
            }
          }

          // Send purchase confirmation notification
          if (customer || createOrderDto.customerInfo) {
            try {
              const customerEmail = customer?.email || createOrderDto.customerInfo?.email;
              const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : createOrderDto.customerInfo?.name || 'Customer';
              const customerPhone = customer?.phone || createOrderDto.customerInfo?.phone;

              if (customerEmail) {
                const orderItems = savedOrder.items.map((item: any) => ({
                  name: item.name || 'Unknown Item',
                  quantity: item.quantity,
                  price: item.price,
                }));

                await this.emailService.sendPurchaseConfirmation(
                  customerEmail,
                  customerName,
                  savedOrder.orderNumber,
                  savedOrder.totalAmount,
                  orderItems,
                  loyaltyPointsRedeemed || undefined,
                  loyaltyDiscount || undefined,
                );
                console.log(`✅ Sent purchase confirmation email to ${customerEmail}`);
              }

              if (customerPhone) {
                const smsMessage = `Thank you for your order! Order #${savedOrder.orderNumber} has been confirmed.${loyaltyPointsRedeemed > 0 ? ` You redeemed ${loyaltyPointsRedeemed} points for ${loyaltyDiscount} TK discount.` : ''} Total: ${savedOrder.totalAmount} TK.`;
                await this.smsService.sendSms(customerPhone, smsMessage);
                console.log(`✅ Sent purchase confirmation SMS to ${customerPhone}`);
              }
            } catch (notificationError) {
              console.error('❌ Failed to send purchase notifications:', notificationError);
            }
          }
        }

        // Notify via WebSocket: new order created
        try {
          const orderData: any = savedOrder.toObject ? savedOrder.toObject() : savedOrder;
          
          // Ensure waiterId is included in order data for notifications (convert to string)
          // waiterId might not be in savedOrder because it's not in the schema, so use from DTO
          if (createOrderDto.waiterId) {
            const waiterIdValue: any = createOrderDto.waiterId;
            orderData.waiterId = typeof waiterIdValue === 'string' 
              ? waiterIdValue 
              : String(waiterIdValue);
            console.log(`🔔 [POS Order ${orderData.orderNumber}] Waiter ID set: ${orderData.waiterId}`);
          } else {
            console.log(`⚠️ [POS Order ${orderData.orderNumber}] No waiterId in createOrderDto`);
          }
          
          // Fetch table number if tableId exists
          if (savedOrder.tableId) {
            try {
              const tableIdStr = savedOrder.tableId.toString();
              const table = await this.tablesService.findOne(tableIdStr);
              if (table) {
                orderData.tableNumber = (table as any).tableNumber || (table as any).number;
                console.log(`🍽️ [POS Order ${orderData.orderNumber}] Table number: ${orderData.tableNumber}`);
              }
            } catch (tableError) {
              console.warn(`⚠️ [POS Order ${orderData.orderNumber}] Could not fetch table number:`, tableError);
            }
          }
          
          console.log(`📡 [POS Order ${orderData.orderNumber}] Sending notification, waiterId: ${orderData.waiterId || 'NONE'}, tableNumber: ${orderData.tableNumber || 'NONE'}`);
          this.websocketsGateway.notifyNewOrder(branchId, orderData);
        } catch (wsError) {
          console.error('❌ Failed to emit WebSocket event:', wsError);
        }

        return savedOrder;
      } catch (error: any) {
        lastError = error;
        const isDuplicateOrderNumber =
          error?.code === 11000 &&
          (error?.keyPattern?.orderNumber || error?.keyValue?.orderNumber);

        if (!isDuplicateOrderNumber) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      lastError?.message ||
        'Unable to generate a unique order number after multiple attempts.',
    );
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

    if (filters.orderType) {
      query.orderType = filters.orderType;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate);
          if (isNaN(startDate.getTime())) {
            throw new BadRequestException(`Invalid startDate format: ${filters.startDate}`);
          }
          query.createdAt.$gte = startDate;
        } catch (error) {
          throw new BadRequestException(`Invalid startDate: ${filters.startDate}`);
        }
      }
      if (filters.endDate) {
        try {
          // Check if endDate is already a full ISO string (contains 'T')
          // If it is, use it directly; otherwise append time
          const endDateStr = filters.endDate.includes('T') 
            ? filters.endDate
            : filters.endDate + 'T23:59:59.999Z';
          const endDate = new Date(endDateStr);
          
          if (isNaN(endDate.getTime())) {
            throw new BadRequestException(`Invalid endDate format: ${filters.endDate}`);
          }
          
          query.createdAt.$lte = endDate;
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Invalid endDate: ${filters.endDate}`);
        }
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
        .populate('tableId', 'tableNumber capacity')
        .populate('userId', 'firstName lastName email')
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
      .populate('tableId', 'tableNumber number capacity')
      .populate('userId', 'firstName lastName name email')
      .populate('items.menuItemId', 'name description price')
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

    const updatedOrder = await this.posOrderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    // Notify via WebSocket: order updated
    try {
      this.websocketsGateway.notifyOrderUpdated(
        order.branchId.toString(),
        updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder,
      );
      
      if (updateOrderDto.status) {
        this.websocketsGateway.notifyOrderStatusChanged(
          order.branchId.toString(),
          updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder,
        );
      }
    } catch (wsError) {
      console.error('Failed to emit WebSocket event:', wsError);
    }

    return updatedOrder;
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

    const cancelledOrder = await this.posOrderModel.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: new Types.ObjectId(userId),
        cancellationReason: reason,
      },
      { new: true }
    ).exec();

    // Free the table if it's a dine-in order and no other active orders exist on this table
    if (order.tableId && order.orderType === 'dine-in') {
      try {
        // Check if there are any other active (pending or paid) orders on this table
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const otherActiveOrders = await this.posOrderModel.find({
          tableId: order.tableId,
          _id: { $ne: order._id }, // Exclude the current order being cancelled
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $in: ['pending', 'paid'] },
          orderType: 'dine-in',
        }).countDocuments().exec();

        // Only free the table if no other active orders exist
        if (otherActiveOrders === 0) {
          await this.tablesService.updateStatus(
            order.tableId.toString(),
            {
              status: 'available',
            },
          );
        }
      } catch (tableError) {
        // Log error but don't fail cancellation
        console.error('Failed to free table after cancellation:', tableError);
      }
    }

    // Notify via WebSocket: order cancelled
    try {
      this.websocketsGateway.notifyOrderStatusChanged(
        order.branchId.toString(),
        cancelledOrder.toObject ? cancelledOrder.toObject() : cancelledOrder,
      );
    } catch (wsError) {
      console.error('Failed to emit WebSocket event:', wsError);
    }

    return cancelledOrder;
  }

  // Process payment
  async processPayment(processPaymentDto: ProcessPaymentDto, userId: string, branchId: string, companyId?: string): Promise<POSPayment> {
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
    const updatedOrder = await this.posOrderModel.findByIdAndUpdate(processPaymentDto.orderId, {
      status: 'paid',
      paymentId: savedPayment._id,
      completedAt: new Date(),
    }, { new: true }).exec();

    // Note: We do NOT free the table after payment processing.
    // Tables remain occupied even after payment because customers may still be using them.
    // Tables are only freed when staff explicitly releases them or orders are cancelled.

    // Handle customer loyalty redemption and stats update
    let customer = null;
    if (order.customerId && companyId) {
      try {
        customer = await this.customersService.findOne(order.customerId.toString());
      } catch (error) {
        console.error('Error fetching customer by ID:', error);
      }
    } else if (order.customerInfo?.email && companyId) {
      try {
        customer = await this.customersService.findByEmail(companyId, order.customerInfo.email);
      } catch (error) {
        console.error('Error fetching customer by email:', error);
      }
    }

    if (customer) {
      try {
        const customerId = (customer as any)._id?.toString() || (customer as any).id?.toString();
        
        // Redeem loyalty points if they were used
        if (order.loyaltyPointsRedeemed && order.loyaltyPointsRedeemed > 0) {
          try {
            await this.customersService.redeemLoyaltyPoints(customerId, order.loyaltyPointsRedeemed);
            console.log(`✅ Redeemed ${order.loyaltyPointsRedeemed} loyalty points from customer ${customerId}`);
          } catch (error) {
            console.error('❌ Failed to redeem loyalty points:', error);
          }
        }

        // Update customer statistics
        await this.customersService.updateOrderStats(customerId, order.totalAmount);
        console.log(`✅ Updated customer stats for customer ID: ${customerId}, amount: ${order.totalAmount}`);
      } catch (customerError) {
        console.error('❌ Failed to update customer statistics:', customerError);
      }
    }

    // Send purchase confirmation notification
    if (customer || order.customerInfo) {
      try {
        const customerEmail = customer?.email || order.customerInfo?.email;
        const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : order.customerInfo?.name || 'Customer';
        const customerPhone = customer?.phone || order.customerInfo?.phone;

        if (customerEmail) {
          const orderItems = order.items.map((item: any) => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity,
            price: item.price,
          }));

          await this.emailService.sendPurchaseConfirmation(
            customerEmail,
            customerName,
            order.orderNumber,
            order.totalAmount,
            orderItems,
            order.loyaltyPointsRedeemed || undefined,
            order.loyaltyDiscount || undefined,
          );
          console.log(`✅ Sent purchase confirmation email to ${customerEmail}`);
        }

        if (customerPhone) {
          const smsMessage = `Thank you for your order! Order #${order.orderNumber} has been confirmed.${order.loyaltyPointsRedeemed ? ` You redeemed ${order.loyaltyPointsRedeemed} points for ${order.loyaltyDiscount || 0} TK discount.` : ''} Total: ${order.totalAmount} TK.`;
          await this.smsService.sendSms(customerPhone, smsMessage);
          console.log(`✅ Sent purchase confirmation SMS to ${customerPhone}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send purchase notifications:', notificationError);
      }
    }

    // Notify via WebSocket: payment received
    try {
      this.websocketsGateway.notifyPaymentReceived(
        branchId,
        updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder,
        savedPayment.toObject ? savedPayment.toObject() : savedPayment,
      );
      
      this.websocketsGateway.notifyOrderStatusChanged(
        branchId,
        updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder,
      );
    } catch (wsError) {
      console.error('Failed to emit WebSocket event:', wsError);
    }

    return savedPayment;
  }

  // Get POS statistics
  async getStats(filters: POSStatsFiltersDto): Promise<any> {
    const matchQuery: any = {};

    if (filters.branchId) {
      matchQuery.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.orderType) {
      matchQuery.orderType = filters.orderType;
    }

    if (filters.startDate || filters.endDate) {
      matchQuery.createdAt = {};
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate);
          if (isNaN(startDate.getTime())) {
            throw new BadRequestException(`Invalid startDate format: ${filters.startDate}`);
          }
          matchQuery.createdAt.$gte = startDate;
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Invalid startDate: ${filters.startDate}`);
        }
      }
      if (filters.endDate) {
        try {
          const endDateStr = filters.endDate.includes('T') 
            ? filters.endDate
            : filters.endDate + 'T23:59:59.999Z';
          const endDate = new Date(endDateStr);
          
          if (isNaN(endDate.getTime())) {
            throw new BadRequestException(`Invalid endDate format: ${filters.endDate}`);
          }
          
          matchQuery.createdAt.$lte = endDate;
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Invalid endDate: ${filters.endDate}`);
        }
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
          $lookup: {
            from: 'categories',
            localField: 'menuItem.categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            menuItemId: '$_id',
            name: '$menuItem.name',
            category: { $ifNull: ['$category.name', 'N/A'] },
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
        defaultPaymentMode: 'pay-later',
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
    const deliveryDetails = originalOrder.deliveryDetails
      ? {
          contactName: originalOrder.deliveryDetails.contactName,
          contactPhone: originalOrder.deliveryDetails.contactPhone,
          addressLine1: originalOrder.deliveryDetails.addressLine1,
          addressLine2: originalOrder.deliveryDetails.addressLine2,
          city: originalOrder.deliveryDetails.city,
          state: originalOrder.deliveryDetails.state,
          postalCode: originalOrder.deliveryDetails.postalCode,
          instructions: originalOrder.deliveryDetails.instructions,
          assignedDriver: originalOrder.deliveryDetails.assignedDriver,
        }
      : undefined;

    const takeawayDetails = originalOrder.takeawayDetails
      ? {
          contactName: originalOrder.takeawayDetails.contactName,
          contactPhone: originalOrder.takeawayDetails.contactPhone,
          instructions: originalOrder.takeawayDetails.instructions,
          assignedDriver: originalOrder.takeawayDetails.assignedDriver,
        }
      : undefined;

    const splitOrderData: CreatePOSOrderDto = {
      orderType: (originalOrder.orderType as any) || 'dine-in',
      ...(originalOrder.tableId ? { tableId: originalOrder.tableId.toString() } : {}),
      ...(originalOrder.orderType === 'delivery'
        ? {
            deliveryFee: originalOrder.deliveryFee || 0,
            deliveryDetails,
          }
        : {}),
      ...(originalOrder.orderType === 'takeaway'
        ? {
            takeawayDetails,
          }
        : {}),
      items: itemsToSplit.map((item) => ({
        menuItemId: item.menuItemId?.toString?.() ?? item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      })),
      customerInfo: originalOrder.customerInfo,
      totalAmount: splitTotal,
      status: 'pending',
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
    // Get all tables from the branch using TablesService
    const allTables = await this.tablesService.findAll({ branchId });
    
    // Get active orders for today to determine occupied tables
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Only fetch PENDING orders to determine table occupation
    // Paid orders should NOT keep tables occupied - they're completed transactions
    const pendingOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'pending', // Only pending orders keep tables occupied
      orderType: 'dine-in',
    })
    .populate('userId', 'firstName lastName name')
    .select('tableId orderNumber totalAmount guestCount userId notes status')
    .exec();

    // Also fetch paid orders for display purposes (they don't affect occupation or seat calculation)
    const paidOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'paid',
      orderType: 'dine-in',
    })
    .populate('userId', 'firstName lastName name')
    .select('tableId orderNumber totalAmount guestCount userId notes status completedAt')
    .exec();

    // Group PENDING orders by table (only pending orders affect occupation and seat calculation)
    const ordersByTable = new Map<string, any[]>();
    pendingOrders.forEach(order => {
      if (order.tableId) {
        const tableId = order.tableId.toString();
        if (!ordersByTable.has(tableId)) {
          ordersByTable.set(tableId, []);
        }
        ordersByTable.get(tableId)!.push(order);
      }
    });

    // Group PAID orders by table (for display only - to show order info even after payment)
    const paidOrdersByTable = new Map<string, any[]>();
    paidOrders.forEach(order => {
      if (order.tableId) {
        const tableId = order.tableId.toString();
        if (!paidOrdersByTable.has(tableId)) {
          paidOrdersByTable.set(tableId, []);
        }
        paidOrdersByTable.get(tableId)!.push(order);
      }
    });

      // Transform tables to include occupation status and order details
      return allTables.map((table: any) => {
        const tableId = table._id?.toString() || table.id;
        const tablePendingOrders = ordersByTable.get(tableId) || [];
        const tablePaidOrders = paidOrdersByTable.get(tableId) || [];
        
        // Table is only occupied if there are PENDING orders (paid orders don't keep table occupied)
        const isOccupied = tablePendingOrders.length > 0;
        
        // Only show order details for PENDING orders (paid orders are completed, table is free)
        const primaryOrder = tablePendingOrders.length > 0 ? tablePendingOrders[0] : null;
        
        // Calculate used seats from PENDING orders only (paid orders don't count towards seat usage)
        const usedSeats = tablePendingOrders.reduce((sum: number, order: any) => {
          return sum + (order.guestCount || 0);
        }, 0);
        
        const remainingSeats = Math.max(0, (table.capacity || 0) - usedSeats);
        
        // Extract waiter name from notes or userId (only for pending orders)
        let waiterName = '';
        if (primaryOrder) {
          const notes = primaryOrder.notes || '';
          const waiterMatch = notes.match(/Waiter:\s*(.+)/i);
          if (waiterMatch) {
            waiterName = waiterMatch[1].trim();
          } else if (primaryOrder.userId) {
            const user = primaryOrder.userId as any;
            waiterName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '';
          }
        }

        // Only show orderDetails if there are PENDING orders (not paid orders - they're completed)
        const shouldShowOrderDetails = primaryOrder !== null;
        // Table status: only occupied if pending orders exist, otherwise always available
        // (Don't use table.status from DB as it might be stale - base it on actual pending orders)
        const tableStatus = isOccupied ? 'occupied' : 'available';

        return {
          id: tableId,
          number: table.tableNumber || table.number || '',
          tableNumber: table.tableNumber || table.number || '',
          capacity: table.capacity || 0,
          status: tableStatus,
          currentOrderId: primaryOrder?._id?.toString(),
          location: table.location,
          // Order details - only show for PENDING orders (paid orders mean table is free)
          orderDetails: shouldShowOrderDetails ? {
            currentOrderId: primaryOrder._id?.toString(),
            orderNumber: primaryOrder.orderNumber,
            tokenNumber: primaryOrder.orderNumber,
            totalAmount: primaryOrder.totalAmount || 0,
            waiterName: waiterName,
            guestCount: primaryOrder.guestCount || 0,
            holdCount: 0, // Placeholder - can be tracked later
            usedSeats: usedSeats, // Count pending orders for seat calculation
            remainingSeats: remainingSeats, // Based on pending orders only
            orderStatus: primaryOrder.status || 'pending', // Should always be 'pending' here
            allOrders: tablePendingOrders.map((o: any) => ({
              id: o._id?.toString(),
              orderNumber: o.orderNumber,
              totalAmount: o.totalAmount || 0,
              guestCount: o.guestCount || 0,
              status: o.status || 'pending',
            })),
          } : null,
        };
      });
  }

  // Get waiter active orders count (for busy indicator)
  async getWaiterActiveOrdersCount(branchId: string): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active orders for today grouped by userId (waiter)
    const activeOrders = await this.posOrderModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $in: ['pending', 'paid'] },
          userId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    // Convert to map of waiterId -> activeOrdersCount
    const waiterCounts: Record<string, number> = {};
    activeOrders.forEach((item) => {
      const waiterId = item._id?.toString();
      if (waiterId) {
        waiterCounts[waiterId] = item.count || 0;
      }
    });

    return waiterCounts;
  }

  // Get POS menu items (integrate with real menu service)
  async getPOSMenuItems(filters: any): Promise<any[]> {
    try {
      // Build query filters - pass as strings, not ObjectIds
      const queryFilters: any = {
        branchId: filters.branchId ? filters.branchId.toString() : undefined,
        companyId: filters.companyId ? filters.companyId.toString() : undefined,
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

      // Fetch menu items from database (includes populated ingredient stock info)
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

        // Calculate stock and low-stock flags from ingredient data
        let stock = 999; // Default to "plenty" when not tracking inventory
        let isLowStock = false;
        let isOutOfStock = false;

        if (item.trackInventory === true && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
          for (const ing of item.ingredients) {
            const ingredient: any = ing?.ingredientId;
            if (!ingredient) continue;

            // Out of stock if any ingredient is out
            if (ingredient.isOutOfStock || ingredient.currentStock <= 0) {
              isOutOfStock = true;
              isLowStock = true;
              break;
            }

            // Low stock if any ingredient is flagged low
            if (
              ingredient.isLowStock ||
              (typeof ingredient.currentStock === 'number' &&
                typeof ingredient.minimumStock === 'number' &&
                ingredient.currentStock > 0 &&
                ingredient.currentStock <= ingredient.minimumStock)
            ) {
              isLowStock = true;
            }
          }

          // If any ingredient is out of stock, treat item as out of stock
          if (isOutOfStock) {
            stock = 0;
          }
        }

        // If item is manually marked unavailable, treat as out of stock
        if (item.isAvailable === false) {
          stock = 0;
          isOutOfStock = true;
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
          isAvailable: item.isAvailable !== false && !isOutOfStock,
          image: firstImage,
          stock: stock,
          stockStatus: isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok',
          isLowStock,
          isOutOfStock,
        };
      });
    } catch (error) {
      console.error('Error fetching POS menu items:', error);
      return [];
    }
  }

  // Create kitchen order from POS order
  private async createKitchenOrderFromPOS(
    posOrder: POSOrderDocument,
    menuItemCache: Map<string, any>,
  ): Promise<void> {
    // Get table number if dine-in
    let tableNumber: string | undefined;
    if (posOrder.tableId) {
      try {
        const table = await this.tablesService.findOne(posOrder.tableId.toString());
        tableNumber = table?.tableNumber;
      } catch (error) {
        console.error('Failed to fetch table for kitchen order:', error);
      }
    }

    // Build kitchen order items with menu item names
    const kitchenItems = [];
    for (let index = 0; index < posOrder.items.length; index++) {
      const item = posOrder.items[index];
      const menuItemId = item.menuItemId?.toString();
      
      // Get menu item name from cache or fetch it
      let menuItem = menuItemCache.get(menuItemId || '');
      if (!menuItem && menuItemId) {
        try {
          menuItem = await this.menuItemsService.findOne(menuItemId);
          if (menuItem) {
            menuItemCache.set(menuItemId, menuItem);
          }
        } catch (error) {
          console.error(`Failed to fetch menu item ${menuItemId}:`, error);
        }
      }

      const itemName = menuItem?.name || `Item ${index + 1}`;

      kitchenItems.push({
        itemId: `${posOrder.orderNumber}-${index}`,
        menuItemId: item.menuItemId,
        name: itemName,
        quantity: item.quantity,
        specialInstructions: item.notes,
        status: 'pending',
        priority: 0,
      });
    }

    // Transform POS order to kitchen order format
    const kitchenOrderData = {
      _id: posOrder._id,
      id: posOrder._id.toString(),
      orderId: posOrder._id,
      branchId: posOrder.branchId,
      orderNumber: posOrder.orderNumber,
      tableId: posOrder.tableId,
      tableNumber: tableNumber,
      type: posOrder.orderType, // Map orderType to type for kitchen service
      orderType: posOrder.orderType,
      items: kitchenItems,
      guestName: posOrder.customerInfo?.name,
      customerId: posOrder.customerInfo ? { firstName: posOrder.customerInfo.name } : undefined,
      customerNotes: posOrder.notes,
    };

    // Use kitchen service to create the order
    await this.kitchenService.createFromOrder(kitchenOrderData);
  }

  // ========== DELIVERY MANAGEMENT METHODS ==========

  /**
   * Get delivery orders with optional status filter
   */
  async getDeliveryOrders(
    branchId: string,
    deliveryStatus?: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    assignedDriverId?: string,
  ): Promise<POSOrder[]> {
    const query: any = {
      branchId: new Types.ObjectId(branchId),
      orderType: 'delivery',
    };

    if (deliveryStatus) {
      query.deliveryStatus = deliveryStatus;
    }

    if (assignedDriverId) {
      query.assignedDriverId = new Types.ObjectId(assignedDriverId);
    }

    return this.posOrderModel
      .find(query)
      .populate('userId', 'firstName lastName email')
      .populate('assignedDriverId', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Assign a driver to a delivery order
   */
  async assignDriver(orderId: string, driverId: string, userId: string): Promise<POSOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    if (!Types.ObjectId.isValid(driverId)) {
      throw new BadRequestException('Invalid driver ID');
    }

    // Verify driver exists
    const driver = await this.userModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const order = await this.posOrderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderType !== 'delivery') {
      throw new BadRequestException('This order is not a delivery order');
    }

    // Update order with driver assignment
    order.assignedDriverId = new Types.ObjectId(driverId);
    order.deliveryStatus = 'assigned';
    order.assignedAt = new Date();

    // Update deliveryDetails.assignedDriver for backward compatibility
    if (order.deliveryDetails) {
      order.deliveryDetails.assignedDriver = driverId;
    } else {
      order.deliveryDetails = { assignedDriver: driverId };
    }

    const updatedOrder = await order.save();

    // TODO: Optionally emit websocket event for delivery updates in future
    // (No emit here because WebsocketsGateway doesn't expose a generic emit method yet)

    return updatedOrder;
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    orderId: string,
    status: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    userId: string,
  ): Promise<POSOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.posOrderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderType !== 'delivery') {
      throw new BadRequestException('This order is not a delivery order');
    }

    // Update status and timestamps
    order.deliveryStatus = status;

    switch (status) {
      case 'out_for_delivery':
        order.outForDeliveryAt = new Date();
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        order.completedAt = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.cancelledBy = new Types.ObjectId(userId);
        break;
    }

    const updatedOrder = await order.save();

    // TODO: Optionally emit websocket event for delivery updates in future

    return updatedOrder;
  }
}

