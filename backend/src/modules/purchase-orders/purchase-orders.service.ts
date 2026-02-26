import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { PurchaseOrderFilterDto } from '../../common/dto/pagination.dto';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum';
import { ExpensesService } from '../expenses/expenses.service';
import {
  Ingredient,
  IngredientDocument,
} from '../ingredients/schemas/ingredient.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { WorkPeriodsService } from '../work-periods/work-periods.service';
import { ApprovePurchaseOrderDto } from './dto/approve-purchase-order.dto';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from './schemas/purchase-order.schema';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Ingredient.name)
    private readonly ingredientModel: Model<IngredientDocument>,
    @Inject(forwardRef(() => ExpensesService))
    private readonly expensesService: ExpensesService,
    @Inject(forwardRef(() => WorkPeriodsService))
    private readonly workPeriodsService: WorkPeriodsService,
  ) {}

  private generateOrderNumber(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `PO-${year}${month}${day}-${random}`;
  }

  private async buildItems(itemsDto: CreatePurchaseOrderDto['items']) {
    const ingredientIds = itemsDto.map((item) => item.ingredientId);
    const ingredients = await this.ingredientModel
      .find({
        _id: { $in: ingredientIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('name unit')
      .lean();

    const ingredientsMap = new Map(
      ingredients.map((ing) => [ing._id.toString(), ing]),
    );

    const items = itemsDto.map((item) => {
      const ingredient = ingredientsMap.get(item.ingredientId);
      if (!ingredient) {
        throw new BadRequestException(
          `Ingredient ${item.ingredientId} not found`,
        );
      }

      const totalPrice = item.quantity * item.unitPrice;
      return {
        ingredientId: new Types.ObjectId(item.ingredientId),
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        receivedQuantity: 0,
        notes: item.notes,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    return { items, totalAmount };
  }

  private async populateOrder(order: PurchaseOrderDocument | null) {
    if (!order) return null;
    await order.populate('supplierId', 'name contactPerson phone email');
    await order.populate('items.ingredientId', 'name unit');

    const orderObj = order.toObject();
    return {
      ...orderObj,
      supplier: orderObj.supplierId,
      items: orderObj.items.map((item) => ({
        ...item,
        ingredient: item.ingredientId,
      })),
    };
  }

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto, userRole?: string) {
    // Check if user is owner or super_admin
    const normalizedRole = userRole?.toLowerCase();
    const isOwnerOrSuperAdmin = normalizedRole === 'owner' || normalizedRole === 'super_admin';

    // If not owner/super_admin, check for active work period
    if (!isOwnerOrSuperAdmin) {
      const activePeriod = await this.workPeriodsService.findActive(
        createPurchaseOrderDto.companyId,
        createPurchaseOrderDto.branchId,
      );
      if (!activePeriod) {
        throw new BadRequestException('Purchase orders can only be recorded during an active work period.');
      }
    }

    if (!createPurchaseOrderDto.items || createPurchaseOrderDto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const supplier = await this.supplierModel
      .findById(createPurchaseOrderDto.supplierId)
      .select('name contactPerson phone email')
      .lean();

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const { items, totalAmount } = await this.buildItems(
      createPurchaseOrderDto.items,
    );

    const purchaseOrder = new this.purchaseOrderModel({
      orderNumber: this.generateOrderNumber(),
      companyId: new Types.ObjectId(createPurchaseOrderDto.companyId),
      branchId: createPurchaseOrderDto.branchId
        ? new Types.ObjectId(createPurchaseOrderDto.branchId)
        : undefined,
      supplierId: new Types.ObjectId(createPurchaseOrderDto.supplierId),
      supplierSnapshot: supplier,
      status: PurchaseOrderStatus.PENDING,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(createPurchaseOrderDto.expectedDeliveryDate),
      notes: createPurchaseOrderDto.notes,
      totalAmount,
      taxAmount: 0,
      discountAmount: 0,
      items,
      paymentMethod: createPurchaseOrderDto.paymentMethod,
    });

    const savedOrder = await purchaseOrder.save();
    return this.populateOrder(savedOrder);
  }

  async findAll(filterDto: PurchaseOrderFilterDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      startDate,
      endDate,
      ...restFilters
    } = filterDto;

    const skip = (page - 1) * limit;
    const query: any = {};

    if (restFilters.companyId) {
      query.companyId = new Types.ObjectId(restFilters.companyId);
    }

    if (restFilters.branchId) {
      query.branchId = new Types.ObjectId(restFilters.branchId);
    }

    if (restFilters.supplierId) {
      query.supplierId = new Types.ObjectId(restFilters.supplierId);
    }

    if (restFilters.status) {
      query.status = restFilters.status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.orderDate.$lte = new Date(endDate);
      }
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      this.purchaseOrderModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('supplierId', 'name contactPerson phone email')
        .populate('items.ingredientId', 'name unit')
        .exec(),
      this.purchaseOrderModel.countDocuments(query),
    ]);

    const normalizedOrders = orders.map((order) => {
      const obj = order.toObject();
      return {
        ...obj,
        supplier: obj.supplierId,
        items: obj.items.map((item) => ({
          ...item,
          ingredient: item.ingredientId,
        })),
      };
    });

    return {
      orders: normalizedOrders,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order ID');
    }

    const order = await this.purchaseOrderModel
      .findById(id)
      .populate('supplierId', 'name contactPerson phone email')
      .populate('items.ingredientId', 'name unit');

    const populated = await this.populateOrder(order);

    if (!populated) {
      throw new NotFoundException('Purchase order not found');
    }

    return populated;
  }

  async update(id: string, updateDto: UpdatePurchaseOrderDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order ID');
    }

    const order = await this.purchaseOrderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      order.status === PurchaseOrderStatus.RECEIVED ||
      order.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update a received or cancelled purchase order',
      );
    }

    if (updateDto.expectedDeliveryDate) {
      order.expectedDeliveryDate = new Date(updateDto.expectedDeliveryDate);
    }

    if (updateDto.notes !== undefined) {
      order.notes = updateDto.notes;
    }

    if (updateDto.items && updateDto.items.length > 0) {
      const remappedItems = updateDto.items.map((item) => {
        if (!item.ingredientId) {
          throw new BadRequestException('Ingredient ID is required for items');
        }
        if (!item.quantity || !item.unitPrice) {
          throw new BadRequestException(
            'Quantity and unit price are required for items',
          );
        }
        return {
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        };
      });
      const { items, totalAmount } = await this.buildItems(remappedItems);
      order.items = items;
      order.totalAmount = totalAmount;
    }

    await order.save();
    return this.findOne(id);
  }

  async approve(id: string, dto: ApprovePurchaseOrderDto) {
    const order = await this.purchaseOrderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be approved');
    }

    order.status = PurchaseOrderStatus.APPROVED;
    order.approvedBy = dto.approvedBy;
    order.approvedAt = new Date();
    if (dto.notes) {
      order.notes = dto.notes;
    }

    await order.save();
    return this.findOne(id);
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto) {
    console.log(`[DEBUG] PurchaseOrdersService.receive called for ID: ${id}`);
    console.log(`[DEBUG] Received items: ${JSON.stringify(dto.receivedItems)}`);
    const order = await this.purchaseOrderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      order.status !== PurchaseOrderStatus.APPROVED &&
      order.status !== PurchaseOrderStatus.ORDERED
    ) {
      throw new BadRequestException(
        'Only approved or ordered purchase orders can be received',
      );
    }

    let totalReceivedAmountInThisCall = 0;
    const logPath = path.join(process.cwd(), 'txn-debug.log');
    const receivedItemsDetails: string[] = [];

    for (const item of dto.receivedItems) {
      const orderItem = order.items.find(
        (oi) => oi._id?.toString() === item.itemId,
      );
      if (!orderItem) {
        throw new BadRequestException(`Order item ${item.itemId} not found`);
      }

      const oldReceivedQty = orderItem.receivedQuantity || 0;
      const newReceivedQtyTotal = Math.min(orderItem.quantity, item.receivedQuantity);
      const deltaQty = newReceivedQtyTotal - oldReceivedQty;

      if (deltaQty > 0) {
        orderItem.receivedQuantity = newReceivedQtyTotal;
        const itemTotal = deltaQty * orderItem.unitPrice;
        totalReceivedAmountInThisCall += itemTotal;
        receivedItemsDetails.push(`${orderItem.ingredientName} (${deltaQty} ${orderItem.unit})`);

        // Update Ingredient Inventory
        try {
          const ingredient = await this.ingredientModel.findById(orderItem.ingredientId);
          if (ingredient) {
            ingredient.currentStock += deltaQty;
            ingredient.totalPurchased += deltaQty;
            ingredient.lastPurchasePrice = orderItem.unitPrice;
            ingredient.lastRestockedDate = new Date();
            await ingredient.save();
            fs.appendFileSync(logPath, `[PO-RECEIVE] Updated inventory for ${orderItem.ingredientName}: +${deltaQty}\n`);
          } else {
            fs.appendFileSync(logPath, `[PO-RECEIVE] FAILED: Ingredient ${orderItem.ingredientId} not found\n`);
          }
        } catch (invError) {
          console.error(`❌ Failed to update inventory for ingredient ${orderItem.ingredientName}:`, invError);
          fs.appendFileSync(logPath, `[PO-RECEIVE] Inventory Update ERROR for ${orderItem.ingredientName}\n`);
        }
      }
    }

    const fullyReceived = order.items.every(
      (item) => item.receivedQuantity >= item.quantity,
    );

    if (fullyReceived) {
      order.status = PurchaseOrderStatus.RECEIVED;
      order.actualDeliveryDate = new Date();
    } else {
      order.status = PurchaseOrderStatus.ORDERED;
    }

    // Automatically create an expense entry if anything was received in this call
    if (totalReceivedAmountInThisCall > 0) {
      try {
        const supplier = await this.supplierModel.findById(order.supplierId).lean();
        
        fs.appendFileSync(logPath, `[PO-RECEIVE] Creating partial expense for ${order.orderNumber}, Amount: ${totalReceivedAmountInThisCall}\n`);

        const expenseData = {
          companyId: order.companyId.toString(),
          branchId: order.branchId?.toString() || order.companyId.toString(),
          title: `Purchase Receipt: ${order.orderNumber}`,
          description: `Partial receipt from ${supplier?.name || 'Supplier'}. Items: ${receivedItemsDetails.join(', ')}`,
          amount: totalReceivedAmountInThisCall,
          category: 'ingredient',
          date: new Date().toISOString().split('T')[0],
          vendorName: supplier?.name,
          invoiceNumber: order.orderNumber,
          supplierId: order.supplierId.toString(),
          paymentMethod: (order as any).paymentMethod || 'cash',
          status: 'paid', // Mark as paid to trigger ledger transaction
          notes: `Auto-created from receipt update of PO ${order.orderNumber}.`,
          createdBy: order.approvedBy?.toString() || (order as any).createdBy?.toString() || (order as any).companyId?.toString(),
          isRecurring: false,
          purchaseOrderId: order._id.toString(),
        };

        const createdExpense = await this.expensesService.create(expenseData);
        fs.appendFileSync(logPath, `[PO-RECEIVE] SUCCESS: Created partial expense ${createdExpense.expenseNumber}\n`);
      } catch (expenseError: any) {
        console.error('❌ Failed to create partial expense from purchase order:', expenseError);
        fs.appendFileSync(logPath, `[PO-RECEIVE] Expense Creation FAILED: ${expenseError.message}\n`);
      }
    }

    await order.save();
    return this.findOne(id);
  }

  async cancel(id: string, dto: CancelPurchaseOrderDto) {
    const order = await this.purchaseOrderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      order.status === PurchaseOrderStatus.RECEIVED ||
      order.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel an already received or cancelled order',
      );
    }

    order.status = PurchaseOrderStatus.CANCELLED;
    order.cancellationReason = dto.reason;
    await order.save();
    return this.findOne(id);
  }
}
