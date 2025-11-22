import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IngredientFilterDto } from '../../common/dto/pagination.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private ingredientModel: Model<IngredientDocument>,
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

  async findLowStock(companyId: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isLowStock: true,
        isActive: true,
      })
      .sort({ currentStock: 1 })
      .exec();
  }

  async findOutOfStock(companyId: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isOutOfStock: true,
        isActive: true,
      })
      .exec();
  }

  async findNeedReorder(companyId: string): Promise<Ingredient[]> {
    return this.ingredientModel
      .find({
        companyId: new Types.ObjectId(companyId),
        needsReorder: true,
        isActive: true,
      })
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

    const ingredient = await this.ingredientModel.findByIdAndUpdate(
      id,
      updateIngredientDto,
      { new: true },
    );

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async adjustStock(
    id: string,
    adjustmentDto: StockAdjustmentDto,
  ): Promise<Ingredient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ingredient ID');
    }

    const ingredient = await this.ingredientModel.findById(id);

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const { type, quantity, reason } = adjustmentDto;

    switch (type) {
      case 'add':
        ingredient.currentStock += quantity;
        ingredient.totalPurchased += quantity;
        ingredient.lastRestockedDate = new Date();
        break;

      case 'remove':
        if (ingredient.currentStock < quantity) {
          throw new BadRequestException('Insufficient stock');
        }
        ingredient.currentStock -= quantity;
        ingredient.totalUsed += quantity;
        ingredient.lastUsedDate = new Date();
        break;

      case 'set':
        ingredient.currentStock = quantity;
        break;

      case 'wastage':
        if (ingredient.currentStock < quantity) {
          throw new BadRequestException('Insufficient stock');
        }
        ingredient.currentStock -= quantity;
        ingredient.totalWastage += quantity;
        break;

      default:
        throw new BadRequestException('Invalid adjustment type');
    }

    return ingredient.save();
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

  async getStats(companyId: string): Promise<any> {
    const ingredients = await this.ingredientModel.find({
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    });

    const totalValue = ingredients.reduce(
      (sum, ing) => sum + ing.currentStock * ing.unitCost,
      0,
    );

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

  async getValuation(companyId: string): Promise<any> {
    const ingredients = await this.ingredientModel.find({
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    });

    const items = ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.currentStock,
      unit: ing.unit,
      unitCost: ing.unitCost,
      totalValue: ing.currentStock * ing.unitCost,
    }));

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      items,
      totalValue,
      generatedAt: new Date(),
    };
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

