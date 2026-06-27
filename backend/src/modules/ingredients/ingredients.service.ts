import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IngredientFilterDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';
import { Wastage, WastageDocument, WastageReason } from '../wastage/schemas/wastage.schema';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private ingredientModel: Model<IngredientDocument>,
    @InjectModel(Wastage.name)
    private wastageModel: Model<WastageDocument>,
    private websocketsGateway: WebsocketsGateway,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PurchaseOrdersService))
    private purchaseOrdersService: PurchaseOrdersService,
  ) {}

  async create(createIngredientDto: CreateIngredientDto): Promise<Ingredient> {
    // Check if ingredient exists
    const existingIngredient = await this.ingredientModel.findOne({
      companyId: new Types.ObjectId(createIngredientDto.companyId),
      name: { $regex: new RegExp(`^${createIngredientDto.name}$`, 'i') },
    });

    if (existingIngredient) {
      throw new BadRequestException('Ingredient with this name already exists');
    }

    const ingredientData: any = {
      ...createIngredientDto,
      averageCost: createIngredientDto.unitCost,
      lastPurchasePrice: createIngredientDto.unitCost,
    };

    if (createIngredientDto.companyId) {
      if (!Types.ObjectId.isValid(createIngredientDto.companyId)) {
        throw new BadRequestException('Invalid company ID');
      }
      ingredientData.companyId = new Types.ObjectId(createIngredientDto.companyId);
    }

    if (createIngredientDto.branchId) {
      if (!Types.ObjectId.isValid(createIngredientDto.branchId)) {
        throw new BadRequestException('Invalid branch ID');
      }
      ingredientData.branchId = new Types.ObjectId(createIngredientDto.branchId);
    }

    const ingredient = new this.ingredientModel(ingredientData);

    return ingredient.save();
  }

  async findAll(filterDto: IngredientFilterDto): Promise<{ ingredients: Ingredient[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'name', 
      sortOrder = 'asc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const query: any = { ...filters };

    // Convert string IDs to ObjectIds for proper MongoDB querying
    if (query.companyId && typeof query.companyId === 'string') {
      query.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.branchId && typeof query.branchId === 'string') {
      query.branchId = new Types.ObjectId(query.branchId);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { unit: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { storageLocation: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const ingredients = await this.ingredientModel
      .find(query)
      .populate('preferredSupplierId', 'name contactPerson phone')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.ingredientModel.countDocuments(query);

    return {
      ingredients,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel
      .findById(id)
      .populate('preferredSupplierId', 'name contactPerson phone email')
      .populate('alternativeSupplierIds', 'name contactPerson phone');

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async findByCompany(companyId: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
      })
      .populate('preferredSupplierId', 'name')
      .sort({ name: 1 })
      .exec();
  }

  async findByBranch(branchId: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        $or: [
          { branchId: new Types.ObjectId(branchId) },
          { branchId: null }, // Company-wide ingredients
        ],
        isActive: true,
      })
      .populate('preferredSupplierId', 'name')
      .sort({ name: 1 })
      .exec();
  }

  async findLowStock(companyId: string, branchId?: string): Promise<Ingredient[]> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isLowStock: true,
      isActive: true,
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    return this.ingredientModel
      .find(query)
      .sort({ currentStock: 1 })
      .exec();
  }

  async findOutOfStock(companyId: string, branchId?: string): Promise<Ingredient[]> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isOutOfStock: true,
      isActive: true,
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    return this.ingredientModel.find(query).exec();
  }

  async findNeedReorder(companyId: string, branchId?: string): Promise<Ingredient[]> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      needsReorder: true,
      isActive: true,
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    return this.ingredientModel
      .find(query)
      .populate('preferredSupplierId', 'name contactPerson phone email')
      .exec();
  }

  async search(companyId: string, query: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        companyId: new Types.ObjectId(companyId),
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { sku: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ],
        isActive: true,
      })
      .limit(20)
      .exec();
  }

  async update(
    id: string,
    updateIngredientDto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel.findById(id);
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    // Apply updates
    Object.assign(ingredient, updateIngredientDto);

    // Save will trigger the pre('save') hook to recalculate status flags
    return ingredient.save();
  }

  async adjustStock(
    id: string,
    adjustmentDto: StockAdjustmentDto,
    userId?: string,
  ): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel.findById(id);

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const { type, quantity, reason, supplierId, unitPrice, paymentMethod } = adjustmentDto;

    switch (type) {
      case 'add':
        if (supplierId && unitPrice !== undefined) {
          // If supplier and price are provided, treat as a "Purchase"
          await this.purchaseOrdersService.quickPurchase({
            companyId: ingredient.companyId.toString(),
            branchId: ingredient.branchId?.toString(),
            supplierId,
            ingredientId: ingredient._id.toString(),
            quantity,
            unitPrice,
            paymentMethod,
            notes: reason,
            createdBy: userId,
          });
          // Note: quickPurchase already updates currentStock and totalPurchased
          // so we don't need to do it again here.
          return this.ingredientModel.findById(id);
        } else {
          // Legacy behavior for simple stock adjustment
          ingredient.currentStock += quantity;
          ingredient.totalPurchased += quantity;
          ingredient.lastRestockedDate = new Date();
          
          // Also add to a default batch if no expiry is known, 
          // or just don't add to batches since it's legacy without PO.
        }
        break;

      case 'remove':
        if (ingredient.currentStock < quantity) {
          throw new BadRequestException('Insufficient stock');
        }
        
        let totalDeductedCostRemove = 0;
        // FIFO Batch Deduction
        if (ingredient.batches && ingredient.batches.length > 0) {
          ingredient.batches.sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
          let remainingToDeduct = quantity;
          for (let i = 0; i < ingredient.batches.length && remainingToDeduct > 0; i++) {
            const batchCost = ingredient.batches[i].unitCost || ingredient.unitCost || 0;
            if (ingredient.batches[i].quantity <= remainingToDeduct) {
              totalDeductedCostRemove += ingredient.batches[i].quantity * batchCost;
              remainingToDeduct -= ingredient.batches[i].quantity;
              ingredient.batches[i].quantity = 0;
            } else {
              totalDeductedCostRemove += remainingToDeduct * batchCost;
              ingredient.batches[i].quantity -= remainingToDeduct;
              remainingToDeduct = 0;
            }
          }
          if (remainingToDeduct > 0) {
            totalDeductedCostRemove += remainingToDeduct * (ingredient.unitCost || 0);
          }
          // Filter out empty batches
          ingredient.batches = ingredient.batches.filter((b: any) => b.quantity > 0);
        } else {
          totalDeductedCostRemove = quantity * (ingredient.unitCost || 0);
        }

        ingredient.currentStock -= quantity;
        ingredient.totalUsed += quantity;
        ingredient.lastUsedDate = new Date();
        break;

      case 'set':
        ingredient.currentStock = quantity;
        if (quantity === 0) {
          ingredient.batches = [];
        }
        break;

      case 'wastage':
        if (ingredient.currentStock < quantity) {
          throw new BadRequestException('Insufficient stock');
        }
        
        let totalDeductedCostWastage = 0;
        // FIFO Batch Deduction
        if (ingredient.batches && ingredient.batches.length > 0) {
          ingredient.batches.sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
          let remainingToDeduct = quantity;
          for (let i = 0; i < ingredient.batches.length && remainingToDeduct > 0; i++) {
            const batchCost = ingredient.batches[i].unitCost || ingredient.unitCost || 0;
            if (ingredient.batches[i].quantity <= remainingToDeduct) {
              totalDeductedCostWastage += ingredient.batches[i].quantity * batchCost;
              remainingToDeduct -= ingredient.batches[i].quantity;
              ingredient.batches[i].quantity = 0;
            } else {
              totalDeductedCostWastage += remainingToDeduct * batchCost;
              ingredient.batches[i].quantity -= remainingToDeduct;
              remainingToDeduct = 0;
            }
          }
          if (remainingToDeduct > 0) {
            totalDeductedCostWastage += remainingToDeduct * (ingredient.unitCost || 0);
          }
          // Filter out empty batches
          ingredient.batches = ingredient.batches.filter((b: any) => b.quantity > 0);
        } else {
          totalDeductedCostWastage = quantity * (ingredient.unitCost || 0);
        }

        ingredient.currentStock -= quantity;
        ingredient.totalWastage += quantity;

        // Record wastage document for reports
        try {
          const wastageRecord = new this.wastageModel({
            companyId: ingredient.companyId,
            branchId: ingredient.branchId,
            ingredientId: ingredient._id,
            quantity: quantity,
            unit: ingredient.unit,
            reason: reason?.toLowerCase().includes('damage') ? WastageReason.DAMAGED : WastageReason.OTHER,
            unitCost: quantity > 0 ? (totalDeductedCostWastage / quantity) : (ingredient.unitCost || 0),
            totalCost: totalDeductedCostWastage,
            wastageDate: new Date(),
            reportedBy: new Types.ObjectId(userId), // Optional but good to have
            notes: reason || 'Manual stock adjustment (wastage)',
            status: 'approved',
            approvedBy: new Types.ObjectId(userId),
            approvedAt: new Date(),
          });
          await wastageRecord.save();
        } catch (wastageError) {
          console.error('Failed to create wastage record during stock adjustment:', wastageError);
          // We don't throw here to avoid failing the stock adjustment if only the log fails
        }
        break;

      default:
        throw new BadRequestException('Invalid adjustment type');
    }

    const savedIngredient = await ingredient.save();

    // Notify via WebSocket: stock updated
    try {
      const branchId = savedIngredient.branchId?.toString() || 
                       savedIngredient.companyId?.toString();
      
      if (branchId) {
        this.websocketsGateway.notifyStockUpdated(
          branchId,
          savedIngredient.toObject ? savedIngredient.toObject() : savedIngredient,
        );

        // Check and notify low/out of stock
        if (savedIngredient.isLowStock && !savedIngredient.isOutOfStock) {
          this.websocketsGateway.notifyLowStock(
            branchId,
            savedIngredient.toObject ? savedIngredient.toObject() : savedIngredient,
          );
        } else if (savedIngredient.isOutOfStock) {
          this.websocketsGateway.notifyOutOfStock(
            branchId,
            savedIngredient.toObject ? savedIngredient.toObject() : savedIngredient,
          );
        }

        // --- Persistent Notifications ---
        if (savedIngredient.isLowStock || savedIngredient.isOutOfStock) {
          const type = savedIngredient.isOutOfStock ? 'system' : 'priority'; // out of stock is system/critical
          const title = savedIngredient.isOutOfStock ? 'Out of Stock!' : 'Low Stock Alert';
          const message = savedIngredient.isOutOfStock 
            ? `${savedIngredient.name} is completely out of stock`
            : `${savedIngredient.name} is running low (${savedIngredient.currentStock} ${savedIngredient.unit} remaining)`;

          await this.notificationsService.create({
            companyId: savedIngredient.companyId.toString(),
            branchId,
            roles: ['owner', 'manager', 'chef', 'cook'],
            type: type as any,
            title,
            message,
            metadata: { ingredientId: savedIngredient._id.toString() },
          });
        }
      }
    } catch (wsError) {
      console.error('Failed to emit WebSocket event:', wsError);
    }

    return savedIngredient;
  }

  async addStock(id: string, quantity: number): Promise<Ingredient> {
    return this.adjustStock(id, {
      type: 'add',
      quantity,
      reason: 'Purchase',
    });
  }

  async removeStock(id: string, quantity: number): Promise<Ingredient> {
    return this.adjustStock(id, {
      type: 'remove',
      quantity,
      reason: 'Usage',
    });
  }

  async updatePricing(
    id: string,
    unitCost: number,
  ): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel.findById(id);

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    // Update average cost (weighted average)
    if (ingredient.totalPurchased > 0) {
      const totalCost =
        ingredient.averageCost * ingredient.totalPurchased +
        unitCost * ingredient.currentStock;
      ingredient.averageCost =
        totalCost / (ingredient.totalPurchased + ingredient.currentStock);
    } else {
      ingredient.averageCost = unitCost;
    }

    ingredient.lastPurchasePrice = unitCost;
    ingredient.unitCost = unitCost;

    return ingredient.save();
  }

  async deactivate(id: string): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel.findByIdAndUpdate(
      id,
      {
        isActive: false,
        deactivatedAt: new Date(),
      },
      { new: true },
    );

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const result = await this.ingredientModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Ingredient not found');
    }
  }

  async getStats(companyId: string, branchId?: string): Promise<any> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    const ingredients = await this.ingredientModel.find(query);

    const totalValue = ingredients.reduce((sum, ing) => {
      let ingTrueValue = 0;
      if (ing.batches && ing.batches.length > 0) {
        const batchValue = ing.batches.reduce((bSum, b) => bSum + (b.quantity * (b.unitCost || ing.unitCost || 0)), 0);
        const batchQty = ing.batches.reduce((bSum, b) => bSum + b.quantity, 0);
        const legacyQty = Math.max(0, ing.currentStock - batchQty);
        ingTrueValue = batchValue + (legacyQty * (ing.unitCost || 0));
      } else {
        ingTrueValue = ing.currentStock * (ing.unitCost || 0);
      }
      return sum + ingTrueValue;
    }, 0);

    return {
      total: ingredients.length,
      lowStock: ingredients.filter((i) => i.isLowStock).length,
      outOfStock: ingredients.filter((i) => i.isOutOfStock).length,
      needReorder: ingredients.filter((i) => i.needsReorder).length,
      totalInventoryValue: totalValue,
      byCategory: {
        food: ingredients.filter((i) => i.category === 'food').length,
        beverage: ingredients.filter((i) => i.category === 'beverage').length,
        packaging: ingredients.filter((i) => i.category === 'packaging').length,
        cleaning: ingredients.filter((i) => i.category === 'cleaning').length,
        other: ingredients.filter((i) => i.category === 'other').length,
      },
    };
  }

  async getValuation(companyId: string, branchId?: string): Promise<any> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    const ingredients = await this.ingredientModel.find(query);

    const items = ingredients.map((ing) => {
      let trueValue = 0;
      if (ing.batches && ing.batches.length > 0) {
        const batchValue = ing.batches.reduce((sum, b) => sum + (b.quantity * (b.unitCost || ing.unitCost || 0)), 0);
        const batchQty = ing.batches.reduce((sum, b) => sum + b.quantity, 0);
        const legacyQty = Math.max(0, ing.currentStock - batchQty);
        trueValue = batchValue + (legacyQty * (ing.unitCost || 0));
      } else {
        trueValue = ing.currentStock * (ing.unitCost || 0);
      }

      return {
        name: ing.name,
        quantity: ing.currentStock,
        unit: ing.unit,
        unitCost: ing.unitCost, // Keeping master unitCost as a reference
        totalValue: trueValue,
      };
    });

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      items,
      totalValue,
      generatedAt: new Date(),
    };
  }

  async fixAllStockStatuses(companyId: string): Promise<{ fixed: number; total: number }> {
    const ingredients = await this.ingredientModel.find({
      companyId: new Types.ObjectId(companyId),
    });

    let fixedCount = 0;
    for (const ingredient of ingredients) {
      // Fix common typos if found
      if (ingredient.name.toLowerCase() === 'suger') {
        ingredient.name = 'Sugar';
      }

      // Explicitly trigger status recalculation
      const wasLow = ingredient.isLowStock;
      const wasOut = ingredient.isOutOfStock;
      const wasReorder = ingredient.needsReorder;

      // Status logic from schema (copied here for explicit check)
      ingredient.isOutOfStock = (ingredient.currentStock || 0) <= 0;
      ingredient.isLowStock = (ingredient.currentStock || 0) > 0 && 
                               (ingredient.currentStock || 0) <= (ingredient.minimumStock || 0);
      ingredient.needsReorder = (ingredient.reorderPoint || 0) > 0 && 
                                (ingredient.currentStock || 0) <= (ingredient.reorderPoint || 0);
      
      if (wasLow !== ingredient.isLowStock || wasOut !== ingredient.isOutOfStock || ingredient.needsReorder !== wasReorder) {
        fixedCount++;
      }
      
      await ingredient.save();
    }

    return { fixed: fixedCount, total: ingredients.length };
  }

  async bulkImport(
    companyId: string,
    ingredients: CreateIngredientDto[],
  ): Promise<Ingredient[]> {
    const results: Ingredient[] = [];

    for (const dto of ingredients) {
      try {
        const ingredient = await this.create({
          ...dto,
          companyId,
        });
        results.push(ingredient);
      } catch (error) {
        console.error(`Failed to import ingredient: ${dto.name}`, error);
      }
    }

    return results;
  }
}

