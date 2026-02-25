import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { BookingsService } from '../bookings/bookings.service';
import { BranchesService } from '../branches/branches.service';
import { CustomersService } from '../customers/customers.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { KitchenService } from '../kitchen/kitchen.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { OrdersService } from '../orders/orders.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { ServiceChargeSetting, ServiceChargeSettingDocument } from '../settings/schemas/service-charge-setting.schema';
import { TaxSetting, TaxSettingDocument } from '../settings/schemas/tax-setting.schema';
import { SettingsService } from '../settings/settings.service';
import { TablesService } from '../tables/tables.service';
import { TransactionCategory, TransactionType } from '../transactions/schemas/transaction.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WastageReason } from '../wastage/schemas/wastage.schema';
import { WastageService } from '../wastage/wastage.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { WorkPeriodsService } from '../work-periods/work-periods.service';
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
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(POSPayment.name) private posPaymentModel: Model<POSPaymentDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TaxSetting.name) private taxSettingModel: Model<TaxSettingDocument>,
    @InjectModel(ServiceChargeSetting.name) private serviceChargeSettingModel: Model<ServiceChargeSettingDocument>,
    private receiptService: ReceiptService,
    private menuItemsService: MenuItemsService,
    private ingredientsService: IngredientsService,
    private websocketsGateway: WebsocketsGateway,
    private emailService: EmailService,
    private smsService: SmsService,
    private branchesService: BranchesService,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => TablesService))
    private tablesService: TablesService,
    @Inject(forwardRef(() => KitchenService))
    private kitchenService: KitchenService,
    @Inject(forwardRef(() => CustomersService))
    private customersService: CustomersService,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
    @Inject(forwardRef(() => WorkPeriodsService))
    private workPeriodsService: WorkPeriodsService,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
    @Inject(forwardRef(() => WastageService))
    private wastageService: WastageService,
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
    const creatingUser: any = await this.userModel.findById(userId).select('role branchId companyId');
    if (!creatingUser) {
      throw new NotFoundException('User not found');
    }
    const creatingUserBranchId = creatingUser.branchId?.toString();
    const orderBranchId = branchId.toString();
    // Owners can create orders for any branch in their company, but other roles must be assigned to the branch
    if (creatingUser.role !== 'owner' && creatingUserBranchId !== orderBranchId) {
      throw new BadRequestException(`You are not assigned to branch ${orderBranchId}. Please assign yourself to this branch first.`);
    }
    // Validate active work period for non-owner users (only owners can create orders without active work period)
    if (creatingUser.role !== 'owner') {
      if (!companyId) {
        throw new BadRequestException('Company ID is required to validate work period');
      }
      const activeWorkPeriod = await this.workPeriodsService.findActive(companyId, orderBranchId);
      if (!activeWorkPeriod) {
        throw new BadRequestException(
          'No active work period found. Please start a work period from the Work Periods page before creating orders.'
        );
      }
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
              }
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
        // Store tableNumber in order for historical records (even if tableId is cleared later)
        baseOrderData.tableNumber = (table as any).tableNumber || '';
        // Get active orders for this table today
        // ALWAYS check both pending AND paid orders, regardless of payment mode setting
        // This handles scenarios where:
        // - Pay-first order exists (paid) + pay-later order being created (pending)
        // - Pay-later order exists (pending) + pay-first order being created (paid)
        // - Multiple orders with different payment modes on same table
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Get ALL active orders (both pending and paid) for seat calculation
        const existingOrders = await this.posOrderModel.find({
          tableId: new Types.ObjectId(createOrderDto.tableId),
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $in: ['pending', 'paid'] }, // Always check both
          orderType: 'dine-in',
        }).exec();
        // Calculate used seats from ALL orders (both pending and paid)
        // If there are orders with tableId, they're using seats regardless of payment mode
        const usedSeats = existingOrders.reduce((sum, order) => {
          return sum + (order.guestCount || 0);
        }, 0);
        // Log if multiple orders exist (for debugging)
        if (existingOrders.length > 1) {
          const pendingCount = existingOrders.filter(o => o.status === 'pending').length;
          const paidCount = existingOrders.filter(o => o.status === 'paid').length;
        }
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
        // If this is a room_service order, a bookingId is required so that the charge hits the folio.
        if (createOrderDto.orderType === 'room_service') {
          if (!createOrderDto.bookingId) {
            throw new BadRequestException('bookingId is required for room service orders');
          }
          await this.bookingsService.applyAdditionalCharge(
            createOrderDto.bookingId,
            savedOrder.totalAmount,
            'room_service',
            `Room service order ${savedOrder.orderNumber}`,
            savedOrder.status === 'paid', // Only mark as already paid if the POS order itself is paid
          );
        }
        // Update table status if dine-in order
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
            console.error(`❌ [createOrder] Failed to update table ${createOrderDto.tableId} status:`, tableError);
          }
        } else if (createOrderDto.tableId && createOrderDto.orderType === 'dine-in' && savedOrder.status === 'paid') {
          // If order is paid first (pay-first mode), table should still be occupied
          // because the customer is using the table even though they paid upfront
          try {
            const tableUpdateResult = await this.tablesService.updateStatus(
              createOrderDto.tableId.toString(),
              {
                status: 'occupied',
                orderId: savedOrder._id.toString(),
                occupiedBy: userId,
              },
            );
          } catch (tableError) {
            console.error(`❌ [createOrder] Failed to update table ${createOrderDto.tableId} status to occupied:`, tableError);
            // Don't fail order creation, but log the error
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
              amountReceived: createOrderDto.amountReceived,
              changeDue: createOrderDto.changeDue,
            };
            const payment = new this.posPaymentModel(paymentData);
            const savedPayment = await payment.save();
            // Link payment to order
            await this.posOrderModel.findByIdAndUpdate(savedOrder._id, {
              paymentId: savedPayment._id,
              completedAt: new Date(),
            }).exec();
            
            // Record transaction in ledger
            try {
              const resolvedCompanyId = companyId || (creatingUser as any)?.companyId?.toString() || branchId;

              if (createOrderDto.paymentMethod === 'split') {
                // For pay-first split: parse breakdown from transactionId string "method:amount|method:amount"
                const breakdownStr = createOrderDto.transactionId || '';
                const entries = breakdownStr.split('|').filter(Boolean);

                if (entries.length > 0) {
                  let recordedAny = false;
                  for (const entry of entries) {
                    const colonIdx = entry.lastIndexOf(':');
                    if (colonIdx === -1) continue;
                    const subMethod = entry.substring(0, colonIdx).trim();
                    const subAmount = parseFloat(entry.substring(colonIdx + 1).trim());
                    if (subMethod && Number.isFinite(subAmount) && subAmount > 0) {
                      try {
                        await this.transactionsService.recordTransaction(
                          {
                            paymentMethodId: subMethod,
                            type: TransactionType.IN,
                            category: TransactionCategory.SALE,
                            amount: subAmount,
                            date: new Date().toISOString(),
                            referenceId: savedOrder._id.toString(),
                            referenceModel: 'POSOrder',
                            description: `Split payment (${subMethod}) for POS order ${savedOrder.orderNumber}`,
                            notes: `Txn ID: PAY-FIRST-${savedOrder.orderNumber}`,
                          },
                          resolvedCompanyId,
                          branchId,
                          userId,
                        );
                        recordedAny = true;
                      } catch (subTxnError) {
                        console.error(`❌ Failed to record split transaction for method ${subMethod}:`, subTxnError);
                      }
                    }
                  }
                  if (!recordedAny) {
                    // Fallback: record full amount under cash if parsing failed
                    await this.transactionsService.recordTransaction(
                      {
                        paymentMethodId: 'cash',
                        type: TransactionType.IN,
                        category: TransactionCategory.SALE,
                        amount: savedOrder.totalAmount,
                        date: new Date().toISOString(),
                        referenceId: savedOrder._id.toString(),
                        referenceModel: 'POSOrder',
                        description: `Split payment for POS order ${savedOrder.orderNumber}`,
                        notes: `Txn ID: PAY-FIRST-${savedOrder.orderNumber}`,
                      },
                      resolvedCompanyId,
                      branchId,
                      userId,
                    );
                  }
                } else {
                  // Fallback: no breakdown string — record as single cash entry
                  await this.transactionsService.recordTransaction(
                    {
                      paymentMethodId: 'cash',
                      type: TransactionType.IN,
                      category: TransactionCategory.SALE,
                      amount: savedOrder.totalAmount,
                      date: new Date().toISOString(),
                      referenceId: savedOrder._id.toString(),
                      referenceModel: 'POSOrder',
                      description: `Split payment for POS order ${savedOrder.orderNumber}`,
                      notes: `Txn ID: PAY-FIRST-${savedOrder.orderNumber}`,
                    },
                    resolvedCompanyId,
                    branchId,
                    userId,
                  );
                }
              } else {
                const logMsg = `[POSService] Recording transaction for order ${savedOrder.orderNumber}, Method: ${createOrderDto.paymentMethod}, Amount: ${savedOrder.totalAmount}, Company: ${resolvedCompanyId}\n`;
                fs.appendFileSync(path.join(process.cwd(), 'txn-debug.log'), logMsg);

                await this.transactionsService.recordTransaction(
                  {
                    paymentMethodId: createOrderDto.paymentMethod,
                    type: TransactionType.IN,
                    category: TransactionCategory.SALE,
                    amount: savedOrder.totalAmount,
                    date: new Date().toISOString(),
                    referenceId: savedOrder._id.toString(),
                    referenceModel: 'POSOrder',
                    description: `Payment for POS order ${savedOrder.orderNumber}`,
                    notes: `Txn ID: PAY-FIRST-${savedOrder.orderNumber}`,
                  },
                  resolvedCompanyId,
                  branchId,
                  userId,
                );
              }
            } catch (txnError) {
              console.error('❌ Failed to record transaction in ledger for pay-first order:', txnError);
            }
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
                }
            } catch (customerError) {
              console.error('❌ Failed to update customer statistics:', customerError);
            }
          } else if (createOrderDto.customerInfo?.email && companyId) {
            try {
              const customerByEmail = await this.customersService.findByEmail(companyId, createOrderDto.customerInfo.email);
              if (customerByEmail) {
                const customerId = (customerByEmail as any)._id?.toString() || (customerByEmail as any).id?.toString();
                if (customerId) {
                  await this.customersService.updateOrderStats(customerId, savedOrder.totalAmount);
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
              }
              if (customerPhone) {
                const smsMessage = `Thank you for your order! Order #${savedOrder.orderNumber} has been confirmed.${loyaltyPointsRedeemed > 0 ? ` You redeemed ${loyaltyPointsRedeemed} points for ${loyaltyDiscount} TK discount.` : ''} Total: ${savedOrder.totalAmount} TK.`;
                await this.smsService.sendSms(customerPhone, smsMessage);
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
            }
          // Fetch table number if tableId exists
          if (savedOrder.tableId) {
            try {
              const tableIdStr = savedOrder.tableId.toString();
              const table = await this.tablesService.findOne(tableIdStr);
              if (table) {
                orderData.tableNumber = (table as any).tableNumber || (table as any).number;
                }
            } catch (tableError) {
              console.warn(`⚠️ [POS Order ${orderData.orderNumber}] Could not fetch table number:`, tableError);
            }
          }
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
          // Ensure startDate includes time (00:00:00) for proper day start
          // If it's just a date string (YYYY-MM-DD), append time in UTC
          const startDateStr = filters.startDate.includes('T') 
            ? filters.startDate
            : filters.startDate + 'T00:00:00.000Z';
          const startDate = new Date(startDateStr);
          if (isNaN(startDate.getTime())) {
            throw new BadRequestException(`Invalid startDate format: ${filters.startDate}`);
          }
          query.createdAt.$gte = startDate;
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Invalid startDate: ${filters.startDate}`);
        }
      }
      if (filters.endDate) {
        try {
          // Ensure endDate includes time (23:59:59.999) for proper day end
          // If it's just a date string (YYYY-MM-DD), append time in UTC
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

    // 1. Fetch from POSOrder
    const [posOrdersRaw, posTotal] = await Promise.all([
      this.posOrderModel
        .find(query)
        .populate('tableId', 'tableNumber capacity')
        .populate('userId', 'firstName lastName email')
        .populate('paymentId', 'method amount status transactionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.posOrderModel.countDocuments(query).exec(),
    ]);

    const posOrders = (posOrdersRaw as any[]).map(o => ({ ...o, isPublic: false }));

    // 2. Fetch from public Order (only for "pending" or broad queries, or for work period history)
    let mergedOrders: any[] = [...posOrders];
    let total = posTotal;

    // Include public orders if:
    // - No specific status requested (broad query)
    // - Status is one of the "active" statuses (pending, preparing, ready)
    // - There is a date range filter (indicates history/reporting query for work periods)
    const includePublic = !filters.status || 
                         ['pending', 'preparing', 'ready'].includes(filters.status) ||
                         (filters.startDate || filters.endDate);
    
    if (includePublic) {
      const publicQuery: any = {
        branchId: query.branchId,
      };

      // If status filter provided, translate it or use a default set for "active" orders
      if (filters.status) {
        publicQuery.status = filters.status;
      } else if (!filters.startDate && !filters.endDate) {
        // If no date range and no status, limit to active orders to avoid massive fetches
        publicQuery.status = { $in: ['pending', 'preparing', 'ready', 'confirmed'] };
      }

      // Sync date range if present
      if (query.createdAt) {
        publicQuery.createdAt = query.createdAt;
      }
      
      if (filters.orderType) {
        publicQuery.type = filters.orderType;
      }

      if (filters.search) {
        publicQuery.$or = [
          { orderNumber: { $regex: filters.search, $options: 'i' } },
          { guestName: { $regex: filters.search, $options: 'i' } },
          { guestPhone: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const publicOrders = await this.orderModel
        .find(publicQuery)
        .populate('waiterId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(filters.limit || limit)
        .exec();

      const standardizedPublic = publicOrders.map(order => {
        const obj = order.toObject();
        
        // Standardize status: If a public order is completed and fully paid, 
        // we treat it as 'paid' in the POS context for reporting.
        let posStatus = obj.status;
        if (obj.status === 'completed' && obj.paymentStatus === 'paid') {
          posStatus = 'paid';
        } else if (obj.status === 'cancelled') {
          posStatus = 'cancelled';
        } else if (['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(obj.status)) {
          posStatus = 'pending'; // Map all active statuses to pending for POS list
        }
        return {
          ...obj,
          isPublic: true,
          orderType: obj.type || 'dine-in',
          totalAmount: obj.total,
          status: posStatus,
          customerInfo: obj.deliveryInfo || {
            name: obj.guestName || 'Customer',
            phone: obj.guestPhone || '',
          },
          userId: obj.waiterId,
          items: (obj.items || []).map((item: any) => ({
            ...item,
            price: item.unitPrice || item.basePrice || 0, // Map unitPrice to price for POS frontend
          })),
        };
      });

      mergedOrders = [...mergedOrders, ...standardizedPublic];
      total += await this.orderModel.countDocuments(publicQuery).exec();
      
      // Re-sort merged results
      mergedOrders.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Truncate to limit after merging
      mergedOrders = mergedOrders.slice(0, limit);
    }

    return { orders: mergedOrders as any[], total };
  }
  // Get single POS order
  async getOrderById(id: string): Promise<any> {
    // Try POSOrder first
    const posOrder = await this.posOrderModel
      .findById(id)
      .populate('tableId', 'tableNumber number capacity')
      .populate('userId', 'firstName lastName name email')
      .populate('items.menuItemId', 'name description price')
      .populate('paymentId')
      .exec();

    if (posOrder) {
      return posOrder;
    }

    // Try public Order if not found in POSOrder
    const publicOrder = await this.orderModel
      .findById(id)
      .populate('tableId', 'tableNumber number capacity')
      .populate('waiterId', 'firstName lastName name email')
      .populate('items.menuItemId', 'name description price')
      .populate('customerId')
      .exec();

    if (!publicOrder) {
      throw new NotFoundException('Order not found');
    }

    // Standardize public Order to match POSOrder structure for the frontend
    const standardized = publicOrder.toObject() as any;
    return {
      ...standardized,
      orderType: standardized.type || 'dine-in', // Standardize property name
      totalAmount: standardized.total, // Standardize total
      items: (standardized.items || []).map((item: any) => ({
        ...item,
        price: item.unitPrice || item.basePrice || 0, // Map unitPrice to price
      })),
      customerInfo: standardized.deliveryInfo || {
        name: standardized.guestName || 
              (typeof standardized.customerId === 'object' ? standardized.customerId?.firstName : undefined) || 
              'Customer',
        phone: standardized.guestPhone || 
               (typeof standardized.customerId === 'object' ? standardized.customerId?.phone : undefined) || 
               '',
      },
      userId: standardized.waiterId, // Map waiterId to userId
    };
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

    // Try POSOrder first
    const updatedPOSOrder = await this.posOrderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    
    if (updatedPOSOrder) {
      // Notify via WebSocket: order updated
      try {
        this.websocketsGateway.notifyOrderUpdated(
          updatedPOSOrder.branchId.toString(),
          updatedPOSOrder.toObject ? updatedPOSOrder.toObject() : updatedPOSOrder,
        );
        if (updateOrderDto.status) {
          this.websocketsGateway.notifyOrderStatusChanged(
            updatedPOSOrder.branchId.toString(),
            updatedPOSOrder.toObject ? updatedPOSOrder.toObject() : updatedPOSOrder,
          );
        }
      } catch (wsError) {
        console.error('Failed to emit WebSocket event:', wsError);
      }
      return updatedPOSOrder;
    }

    // Try public Order using OrdersService for consistent logic (notifications, etc)
    if (updateOrderDto.status) {
      const publicOrder = await this.orderModel.findById(id).exec();
      if (publicOrder) {
        const updatedPublic = await this.ordersService.updateStatus(id, {
          status: updateOrderDto.status,
          reason: updateOrderDto.cancellationReason,
        });

        // Standardize for return
        const standardized = (updatedPublic as any).toObject ? (updatedPublic as any).toObject() : updatedPublic;
        return {
          ...standardized,
          orderType: standardized.type || 'dine-in',
          totalAmount: standardized.total,
          userId: standardized.waiterId,
        };
      }
    }

    const updatedPublicOrder = await this.orderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updatedPublicOrder) {
      throw new NotFoundException('Order not found');
    }

    // Standardize for return
    const standardized = updatedPublicOrder.toObject() as any;
    return {
      ...standardized,
      orderType: standardized.type || 'dine-in',
      totalAmount: standardized.total,
      userId: standardized.waiterId,
    };
  }
  // Cancel POS order
  async cancelOrder(id: string, reason: string, userId: string): Promise<any> {
    // Try POSOrder first
    let order: any = await this.posOrderModel.findById(id).exec();
    let isPublic = false;

    if (!order) {
      order = await this.orderModel.findById(id).exec();
      isPublic = true;
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'paid') {
      throw new ConflictException('Cannot cancel a paid order');
    }

    const updateData = {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: new Types.ObjectId(userId),
      cancellationReason: reason,
    };

    let cancelledOrder: any;
    if (isPublic) {
      cancelledOrder = await this.orderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    } else {
      cancelledOrder = await this.posOrderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    }

    // Standardize public order for return
    if (isPublic) {
      const standardized = cancelledOrder.toObject();
      cancelledOrder = {
        ...standardized,
        orderType: standardized.type || 'dine-in',
        totalAmount: standardized.total,
        userId: standardized.waiterId,
      };
    }
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
    // Validate active work period for non-owner users (only owners can process payments without active work period)
    const processingUser = await this.userModel.findById(userId).select('role companyId');
    if (processingUser && processingUser.role !== 'owner') {
      if (!companyId) {
        throw new BadRequestException('Company ID is required to validate work period');
      }
      const activeWorkPeriod = await this.workPeriodsService.findActive(companyId, branchId);
      if (!activeWorkPeriod) {
        throw new BadRequestException(
          'No active work period found. Please start a work period from the Work Periods page before processing payments.'
        );
      }
    }
    let order: any = await this.posOrderModel.findById(processPaymentDto.orderId).exec();
    let isPublic = false;

    if (!order) {
      order = await this.orderModel.findById(processPaymentDto.orderId).exec();
      isPublic = !!order;
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    if (order.status === 'paid' || (isPublic && order.paymentStatus === 'paid')) {
      throw new ConflictException('Order is already paid');
    }

    const orderTotal = isPublic ? order.total : order.totalAmount;
    if (Math.abs(orderTotal - processPaymentDto.amount) > 0.01) {
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
      amountReceived: processPaymentDto.amountReceived,
      changeDue: processPaymentDto.changeDue,
    };
    const payment = new this.posPaymentModel(paymentData);
    const savedPayment = await payment.save();
    // Update order status
    let updatedOrder: any;
    if (isPublic) {
      updatedOrder = await this.ordersService.addPayment(processPaymentDto.orderId, {
        method: processPaymentDto.method,
        amount: processPaymentDto.amount,
        transactionId: processPaymentDto.transactionId || savedPayment._id.toString(),
        processedBy: userId,
      });

      // Ensure status is updated to completed if fully paid
      if ((updatedOrder as any).paymentStatus === 'paid' && updatedOrder.status !== 'completed') {
        updatedOrder = await this.ordersService.updateStatus(processPaymentDto.orderId, {
          status: 'completed',
        });
      }
    } else {
      updatedOrder = await this.posOrderModel.findByIdAndUpdate(processPaymentDto.orderId, {
        status: 'paid',
        paymentId: savedPayment._id,
        completedAt: new Date(),
        amountReceived: processPaymentDto.amountReceived,
        changeDue: processPaymentDto.changeDue,
      }, { new: true }).exec();
    }
    // If this is a room_service order that was just paid, add the additional charge to the booking
    if (updatedOrder.orderType === 'room_service' && updatedOrder.bookingId) {
      try {
        await this.bookingsService.applyAdditionalCharge(
          updatedOrder.bookingId.toString(),
          updatedOrder.totalAmount,
          'room_service',
          `Room service order ${updatedOrder.orderNumber}`,
          true, // alreadyPaid = true since payment was just processed
        );
        } catch (chargeError) {
        console.error(`❌ [processPayment] Failed to add additional charge to booking:`, chargeError);
        // Don't fail the payment if charge addition fails - log and continue
      }
    }
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
            } catch (error) {
            console.error('❌ Failed to redeem loyalty points:', error);
          }
        }
        // Update customer statistics
        await this.customersService.updateOrderStats(customerId, order.totalAmount);
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
          }
        if (customerPhone) {
          const smsMessage = `Thank you for your order! Order #${order.orderNumber} has been confirmed.${order.loyaltyPointsRedeemed ? ` You redeemed ${order.loyaltyPointsRedeemed} points for ${order.loyaltyDiscount || 0} TK discount.` : ''} Total: ${order.totalAmount} TK.`;
          await this.smsService.sendSms(customerPhone, smsMessage);
          }
      } catch (notificationError) {
        console.error('❌ Failed to send purchase notifications:', notificationError);
      }
    }
    
    // Record transaction in ledger
    try {
      const resolvedCompanyId = companyId || order.companyId?.toString() || branchId;

      if (processPaymentDto.method === 'split') {
        // Parse breakdown from transactionId string: "method:amount|method:amount"
        const breakdownStr = processPaymentDto.transactionId || '';
        const entries = breakdownStr.split('|').filter(Boolean);

        if (entries.length > 0) {
          for (const entry of entries) {
            const colonIdx = entry.lastIndexOf(':');
            if (colonIdx === -1) continue;
            const subMethod = entry.substring(0, colonIdx).trim();
            const subAmount = parseFloat(entry.substring(colonIdx + 1).trim());
            if (!subMethod || !Number.isFinite(subAmount) || subAmount <= 0) continue;

            try {
              await this.transactionsService.recordTransaction(
                {
                  paymentMethodId: subMethod,
                  type: TransactionType.IN,
                  category: TransactionCategory.SALE,
                  amount: subAmount,
                  date: new Date().toISOString(),
                  referenceId: order._id.toString(),
                  referenceModel: 'POSOrder',
                  description: `Split payment (${subMethod}) for POS order ${order.orderNumber}`,
                  notes: `Split txn ID: ${savedPayment._id}`,
                },
                resolvedCompanyId,
                branchId,
                userId,
              );
            } catch (subTxnError) {
              console.error(`❌ Failed to record split transaction for method ${subMethod}:`, subTxnError);
            }
          }
        } else {
          // Fallback: no breakdown string — record as single cash entry
          console.warn('[processPayment] Split payment but no breakdown in transactionId. Recording as single entry.');
          await this.transactionsService.recordTransaction(
            {
              paymentMethodId: 'cash',
              type: TransactionType.IN,
              category: TransactionCategory.SALE,
              amount: processPaymentDto.amount,
              date: new Date().toISOString(),
              referenceId: order._id.toString(),
              referenceModel: 'POSOrder',
              description: `Split payment for POS order ${order.orderNumber}`,
              notes: `Txn ID: ${savedPayment._id}`,
            },
            resolvedCompanyId,
            branchId,
            userId,
          );
        }
      } else if (processPaymentDto.method) {
        const logMsg = `[POSService] (processPayment) Recording transaction for order ${order.orderNumber}, Method: ${processPaymentDto.method}, Amount: ${processPaymentDto.amount}, Company: ${resolvedCompanyId}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'txn-debug.log'), logMsg);

        await this.transactionsService.recordTransaction(
          {
            paymentMethodId: processPaymentDto.method,
            type: TransactionType.IN,
            category: TransactionCategory.SALE,
            amount: processPaymentDto.amount,
            date: new Date().toISOString(),
            referenceId: order._id.toString(),
            referenceModel: 'POSOrder',
            description: `Payment for POS order ${order.orderNumber}`,
            notes: `Txn ID: ${savedPayment._id}`,
          },
          resolvedCompanyId,
          branchId,
          userId,
        );
      }
    } catch (txnError) {
      console.error('❌ Failed to record transaction in ledger:', txnError);
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
      // Fetch branch to get companyId
      const branch = await this.branchesService.findOne(branchId);
      let companyIdStr: string | undefined;
      if (branch?.companyId) {
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          companyIdStr = (branch.companyId as any)._id?.toString() || (branch.companyId as any).id?.toString() || branch.companyId.toString();
        } else {
          companyIdStr = branch.companyId.toString();
        }
      }
      
      // Fetch company settings for defaults
      let companySettings: any = {};
      let companyTaxRate = 10;
      let companyServiceChargeRate = 0;
      let companyCurrency = 'USD';
      
      if (companyIdStr && /^[0-9a-fA-F]{24}$/.test(companyIdStr)) {
        try {
          companySettings = await this.settingsService.getCompanySettings(companyIdStr);
          companyCurrency = companySettings?.currency || 'USD';
          
          // Fetch active tax setting for company
          const activeTax = await this.taxSettingModel.findOne({
            companyId: new Types.ObjectId(companyIdStr),
            isActive: true,
            appliesTo: 'all',
          }).exec();
          if (activeTax && activeTax.type === 'percentage') {
            companyTaxRate = activeTax.rate;
          }
          
          // Fetch active service charge setting for company
          const activeServiceCharge = await this.serviceChargeSettingModel.findOne({
            companyId: new Types.ObjectId(companyIdStr),
            isActive: true,
            appliesTo: 'all',
          }).exec();
          if (activeServiceCharge) {
            companyServiceChargeRate = activeServiceCharge.rate;
          }
        } catch (error) {
          // If company settings don't exist or error, use defaults
        }
      }
      
      // Create default settings, using company settings as fallback
      settings = new this.posSettingsModel({
        branchId: new Types.ObjectId(branchId),
        taxRate: companyTaxRate,
        serviceCharge: companyServiceChargeRate,
        currency: companyCurrency,
        defaultPaymentMode: 'pay-later',
        receiptSettings: {
          header: companySettings?.receiptSettings?.header || 'Welcome to Our Restaurant',
          footer: companySettings?.receiptSettings?.footer || 'Thank you for your visit!',
          showLogo: companySettings?.receiptSettings?.showLogo ?? true,
          logoUrl: companySettings?.receiptSettings?.logoUrl || '',
          fontSize: companySettings?.receiptSettings?.fontSize || 12,
          paperWidth: companySettings?.receiptSettings?.paperWidth || 80,
          wifi: companySettings?.receiptSettings?.wifi || '',
          wifiPassword: companySettings?.receiptSettings?.wifiPassword || '',
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
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      })),
      subtotal: splitTotal,
      taxRate: originalOrder.taxRate || 0,
      taxAmount: (splitTotal * (originalOrder.taxRate || 0)) / 100,
      serviceChargeRate: originalOrder.serviceChargeRate || 0,
      serviceChargeAmount: (splitTotal * (originalOrder.serviceChargeRate || 0)) / 100,
      totalAmount: splitTotal + ((splitTotal * (originalOrder.taxRate || 0)) / 100) + ((splitTotal * (originalOrder.serviceChargeRate || 0)) / 100) + (originalOrder.orderType === 'delivery' ? (originalOrder.deliveryFee || 0) : 0),
      status: 'pending',
      customerInfo: originalOrder.customerInfo,
      notes: `Split from Order #${originalOrder.orderNumber}`,
      waiterId: originalOrder.userId?.toString(),
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
  async processRefund(orderId: string, amount: number, reason: string, userId: string, branchId: string, options?: { isDamage?: boolean }): Promise<POSPayment> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'paid') {
      throw new BadRequestException('Can only refund paid orders');
    }
    if (amount > order.totalAmount) {
      throw new BadRequestException('Refund amount cannot exceed order total');
    }

    // Capture companyId from order or request context
    const companyId = order.companyId?.toString();

    // If marked as damage, record wastage
    if (options?.isDamage && companyId) {
      try {
        if (this.wastageService) {
          for (const item of order.items) {
            await this.wastageService.create({
              menuItemId: item.menuItemId?.toString(),
              quantity: item.quantity,
              unit: 'pcs',
              reason: WastageReason.DAMAGED,
              unitCost: item.price,
              wastageDate: new Date().toISOString(),
              notes: `Auto-recorded from Refund of Order #${order.orderNumber}. Reason: ${reason}`,
            }, companyId, branchId, userId);
          }
        }
      } catch (error) {
        console.error('❌ [processRefund] Failed to record wastage:', error);
        // Don't fail the refund if wastage recording fails, but log it
      }
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
        isDamage: options?.isDamage || false,
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

  // Get POS payments with filters
  async getPayments(filters: { branchId?: string; startDate?: string; endDate?: string }): Promise<POSPayment[]> {
    const query: any = {};
    if (filters.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    // Only count completed and refunded payments for revenue
    query.status = { $in: ['completed', 'refunded'] };
    
    return this.posPaymentModel.find(query).sort({ createdAt: 1 }).exec();
  }
  // Get available tables (integrate with real table service)
  async getAvailableTables(branchId: string): Promise<any[]> {
    // Get all tables from the branch using TablesService
    const allTables = await this.tablesService.findAll({ branchId });
    // Get POS settings to check payment mode
    const posSettings = await this.getPOSSettings(branchId);
    const isPayFirstMode = posSettings.defaultPaymentMode === 'pay-first';
    // IMPORTANT: In pay-first mode, paid orders keep tables occupied
    // But we should also check if there are ANY paid orders with tableId to determine if pay-first was used
    // If we find paid orders with tableId, treat them as occupying tables regardless of setting
    // Get active orders for today to determine occupied tables
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Fetch PENDING orders to determine table occupation
    const pendingOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'pending',
      orderType: 'dine-in',
      tableId: { $exists: true, $ne: null }, // Only get orders with tableId
    })
    .populate('userId', 'firstName lastName name')
    .select('tableId orderNumber totalAmount guestCount userId notes status')
    .lean() // Use lean() for better performance and to ensure tableId is a plain object
    .exec();
    // Fetch paid orders - ALWAYS check for paid orders with tableId
    // If there are paid orders with tableId, the customer paid and is using the table
    // This works regardless of payment mode setting (handles frontend toggle vs backend setting mismatch)
    const paidOrders = await this.posOrderModel.find({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'paid',
      orderType: 'dine-in',
      tableId: { $exists: true, $ne: null }, // Only get orders with tableId
    })
    .select('tableId orderNumber totalAmount guestCount userId notes status completedAt createdAt')
    .lean() // Use lean() for better performance and to ensure tableId is a plain object
    .exec();
    // Debug: Also check ALL paid orders (without date filter) to see if there are any
    if (paidOrders.length === 0) {
      const allPaidOrders = await this.posOrderModel.find({
        branchId: new Types.ObjectId(branchId),
        status: 'paid',
        orderType: 'dine-in',
        tableId: { $exists: true, $ne: null },
      })
      .select('tableId orderNumber createdAt status')
      .lean()
      .limit(10)
      .exec();
    }
    // Populate userId separately after lean() to avoid issues
    const paidOrdersWithUser = await Promise.all(
      paidOrders.map(async (order) => {
        if (order.userId) {
          const user = await this.userModel.findById(order.userId).select('firstName lastName name').lean().exec();
          return { ...order, userId: user };
        }
        return order;
      })
    );

    // Always log paid orders if found, regardless of payment mode setting
    if (paidOrdersWithUser.length > 0) {
      paidOrdersWithUser.forEach(order => {
        const tableIdStr = typeof order.tableId === 'object' && order.tableId 
          ? (order.tableId._id || order.tableId).toString() 
          : String(order.tableId || 'null');
      });
    }
    // Group PENDING orders by table
    const ordersByTable = new Map<string, any[]>();
    pendingOrders.forEach(order => {
      if (order.tableId) {
        // Handle both ObjectId and string formats
        let tableId: string;
        if (typeof order.tableId === 'object') {
          // If it's an ObjectId object, convert to string
          tableId = order.tableId._id ? order.tableId._id.toString() : order.tableId.toString();
        } else {
          // If it's already a string or number, convert to string
          tableId = String(order.tableId);
        }
        if (!ordersByTable.has(tableId)) {
          ordersByTable.set(tableId, []);
        }
        ordersByTable.get(tableId)!.push(order);
      }
    });
    // Group PAID orders by table
    const paidOrdersByTable = new Map<string, any[]>();
    paidOrdersWithUser.forEach(order => {
      if (order.tableId) {
        // Handle both ObjectId and string formats
        let tableId: string;
        if (typeof order.tableId === 'object') {
          // If it's an ObjectId object, convert to string
          tableId = order.tableId._id ? order.tableId._id.toString() : order.tableId.toString();
        } else {
          // If it's already a string or number, convert to string
          tableId = String(order.tableId);
        }
        if (!paidOrdersByTable.has(tableId)) {
          paidOrdersByTable.set(tableId, []);
        }
        paidOrdersByTable.get(tableId)!.push(order);
      }
    });
    if (paidOrdersByTable.size > 0) {
      paidOrdersByTable.forEach((orders, tableId) => {
        // Paid orders found for table
      });
    }
      // Transform tables to include occupation status and order details
      return allTables.map((table: any) => {
        const tableId = table._id?.toString() || table.id;
        const tablePendingOrders = ordersByTable.get(tableId) || [];
        const tablePaidOrders = paidOrdersByTable.get(tableId) || [];
        // Determine if table is occupied:
        // 1. PENDING orders always occupy tables
        // 2. PAID orders with tableId should also occupy tables (pay-first behavior)
        //    This handles cases where user toggled pay-first in frontend even if backend setting is pay-later
        //    If there's a paid order with tableId, the customer paid and is using the table
        const isOccupied = tablePendingOrders.length > 0 || tablePaidOrders.length > 0;
        // Debug: Log tables with orders or marked as occupied
        const hasOrders = tablePendingOrders.length > 0 || tablePaidOrders.length > 0;
        if (hasOrders || table.status === 'occupied') {
          // If table is marked occupied in DB but no orders found, show debug info
          if (!hasOrders && table.status === 'occupied') {
            // Table marked as occupied but no orders found
          }
        }
        if (tablePaidOrders.length > 0 && !isPayFirstMode) {
          // Paid orders found but payment mode setting is pay-later. Marking as occupied anyway (customer is using table).
        }
        // Primary order: prefer pending, but show paid if no pending (regardless of mode)
        const primaryOrder = tablePendingOrders.length > 0 
          ? tablePendingOrders[0] 
          : (tablePaidOrders.length > 0 ? tablePaidOrders[0] : null);
        // Calculate used seats from both pending and paid orders
        // If there are paid orders with tableId, they're using seats regardless of payment mode setting
        const usedSeats = [...tablePendingOrders, ...tablePaidOrders].reduce((sum: number, order: any) => {
          return sum + (order.guestCount || 0);
        }, 0);
        const remainingSeats = Math.max(0, (table.capacity || 0) - usedSeats);
        // Extract waiter name from notes or userId
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
        // Show order details if there are orders (pending or paid in pay-first mode)
        const shouldShowOrderDetails = primaryOrder !== null;
        const tableStatus = isOccupied ? 'occupied' : 'available';
        return {
          id: tableId,
          number: table.tableNumber || table.number || '',
          tableNumber: table.tableNumber || table.number || '',
          capacity: table.capacity || 0,
          status: tableStatus,
          currentOrderId: primaryOrder?._id?.toString(),
          location: table.location,
          // Order details - show for pending orders, or paid orders in pay-first mode
          orderDetails: shouldShowOrderDetails ? {
            currentOrderId: primaryOrder._id?.toString(),
            orderNumber: primaryOrder.orderNumber,
            tokenNumber: primaryOrder.orderNumber,
            totalAmount: primaryOrder.totalAmount || 0,
            waiterName: waiterName,
            guestCount: primaryOrder.guestCount || 0,
            holdCount: 0, // Placeholder - can be tracked later
            usedSeats: usedSeats,
            remainingSeats: remainingSeats,
            orderStatus: primaryOrder.status || 'pending',
            allOrders: [...tablePendingOrders, ...tablePaidOrders].map((o: any) => ({
              id: o._id?.toString(),
              orderNumber: o.orderNumber,
              totalAmount: o.totalAmount || 0,
              guestCount: o.guestCount || 0,
              status: o.status,
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
      // Fetch menu items from database (includes populated ingredient stock info)
      const result = await this.menuItemsService.findAll(queryFilters);
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
  ): Promise<any[]> {
    const branchObjectId = new Types.ObjectId(branchId);
    
    // 1. Fetch from POSOrder
    const posQuery: any = {
      branchId: branchObjectId,
      orderType: 'delivery',
    };
    if (deliveryStatus) {
      posQuery.deliveryStatus = deliveryStatus;
    }
    if (assignedDriverId) {
      posQuery.assignedDriverId = new Types.ObjectId(assignedDriverId);
    }
    const posOrders = await this.posOrderModel
      .find(posQuery)
      .populate('userId', 'firstName lastName email')
      .populate('assignedDriverId', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // 2. Fetch from public Order (if they are unconfirmed/pending)
    const publicQuery: any = {
      branchId: branchObjectId,
      type: 'delivery',
    };
    
    if (deliveryStatus === 'pending' || !deliveryStatus) {
      publicQuery.status = { $in: ['pending', 'preparing', 'ready', 'confirmed'] };
    } else {
      if (deliveryStatus) publicQuery.status = 'none';
    }

    const publicOrders = await this.orderModel
      .find(publicQuery)
      .populate('waiterId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const standardizedPos = posOrders.map(o => ({
      ...o,
      id: (o as any)._id || (o as any).id,
      isPublic: false,
    }));

    const standardizedPublic = publicOrders.map(order => ({
      ...order,
      id: (order as any)._id || (order as any).id,
      isPublic: true,
      orderType: 'delivery' as const,
      totalAmount: (order as any).total,
      items: (order.items || []).map((item: any) => ({
        ...item,
        price: item.unitPrice || item.basePrice || 0,
      })),
      customerInfo: (order as any).deliveryInfo || {
        name: (order as any).guestName || 'Customer',
        phone: (order as any).guestPhone || '',
      },
      deliveryStatus: 'pending' as const,
      userId: (order as any).waiterId,
    }));

    // Merge and sort
    const allOrders = [...standardizedPos, ...standardizedPublic];
    return allOrders.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
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

    // Try POSOrder first
    let order = await this.posOrderModel.findById(orderId);
    if (!order) {
      // Try public Order
      const publicOrder = await this.orderModel.findById(orderId);
      if (!publicOrder) {
        throw new NotFoundException('Order not found');
      }
      if (publicOrder.type !== 'delivery') {
        throw new BadRequestException('This order is not a delivery order');
      }
      // Note: We can only assign drivers to confirmed POS orders in this system's architecture.
      // If the user tries to assign a driver to an unconfirmed order, we should suggest confirming it first.
      throw new BadRequestException('Please confirm this order before assigning a driver.');
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
    status: 'pending' | 'confirmed' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    userId: string,
  ): Promise<POSOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }
    // Check if this might be a public order if not found in POSOrder
    let order = await this.posOrderModel.findById(orderId);
    
    if (!order) {
      // If status is 'confirmed', try to promote from public Order
      if (status === 'confirmed') {
        try {
          const promotedOrder = await this.promotePublicOrderToPOS(orderId, userId);
          return promotedOrder;
        } catch (error) {
          console.error(`❌ [updateDeliveryStatus] Failed to promote order ${orderId}:`, error);
          throw new NotFoundException('Order not found in POS and could not be promoted from public orders');
        }
      }
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

  /**
   * Promotes a public order to a POS order
   * This is typically called when a manager/cashier confirms an online order
   */
  async promotePublicOrderToPOS(orderId: string, userId: string): Promise<POSOrderDocument> {
    // 1. Fetch the public order
    const publicOrder = await this.orderModel.findById(orderId).populate('items.menuItemId');
    if (!publicOrder) {
      throw new NotFoundException('Public order not found');
    }

    // 2. Check if it's already been promoted (to avoid duplicates)
    const existingPOSOrder = await this.posOrderModel.findOne({ externalOrderId: orderId });
    if (existingPOSOrder) {
      return existingPOSOrder as POSOrderDocument;
    }

    // 3. Map Public Order items to POS items
    const posItems = publicOrder.items.map(item => ({
      menuItemId: item.menuItemId instanceof Types.ObjectId ? item.menuItemId : (item.menuItemId as any)._id,
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
      basePrice: item.basePrice,
      notes: item.specialInstructions
    }));

    // 4. Determine order source and customer info
    const customerInfo = {
      name: publicOrder.deliveryInfo?.name || publicOrder.guestName || 'Public Customer',
      phone: publicOrder.deliveryInfo?.phone || publicOrder.guestPhone,
      email: publicOrder.customerId ? undefined : undefined 
    };

    // 5. Build CreatePOSOrderDto
    const createDto: CreatePOSOrderDto = {
      orderType: publicOrder.type === 'delivery' ? 'delivery' : 
                 publicOrder.type === 'takeaway' ? 'takeaway' : 'dine-in',
      items: posItems as any,
      tableId: publicOrder.tableId?.toString(),
      customerInfo: customerInfo,
      deliveryFee: publicOrder.deliveryFee,
      subtotal: publicOrder.subtotal,
      taxRate: publicOrder.taxRate,
      taxAmount: publicOrder.taxAmount,
      serviceChargeRate: publicOrder.serviceChargeRate,
      serviceChargeAmount: publicOrder.serviceChargeAmount,
      totalAmount: publicOrder.total,
      status: 'pending', 
      orderSource: 'customer_app',
      externalOrderId: orderId,
      deliveryDetails: publicOrder.type === 'delivery' ? {
        contactName: publicOrder.deliveryInfo?.name,
        contactPhone: publicOrder.deliveryInfo?.phone,
        addressLine1: publicOrder.deliveryInfo?.address,
        instructions: publicOrder.deliveryInfo?.instructions
      } : undefined
    };

    // 6. Create the POS order using existing infrastructure
    const newPOSOrder = await this.createOrder(
      createDto, 
      userId, 
      publicOrder.branchId.toString(), 
      publicOrder.companyId.toString()
    );

    // 7. Update public order status to confirmed
    publicOrder.status = 'confirmed';
    publicOrder.confirmedAt = new Date();
    await publicOrder.save();

    // 8. Notify via websocket
    this.websocketsGateway.notifyOrderStatusChanged(publicOrder.branchId.toString(), publicOrder);

    return newPOSOrder as POSOrderDocument;
  }
}