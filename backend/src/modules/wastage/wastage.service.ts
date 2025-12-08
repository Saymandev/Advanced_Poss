import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IngredientsService } from '../ingredients/ingredients.service';
import { CreateWastageDto } from './dto/create-wastage.dto';
import { UpdateWastageDto } from './dto/update-wastage.dto';
import { WastageQueryDto } from './dto/wastage-query.dto';
import { Wastage, WastageDocument } from './schemas/wastage.schema';

@Injectable()
export class WastageService {
  constructor(
    @InjectModel(Wastage.name) private wastageModel: Model<WastageDocument>,
    private ingredientsService: IngredientsService,
  ) {}

  async create(
    createWastageDto: CreateWastageDto,
    companyId: string,
    branchId: string,
    userId: string,
  ): Promise<Wastage> {
    // Validate ingredient exists and belongs to company/branch
    const ingredient = await this.ingredientsService.findOne(
      createWastageDto.ingredientId,
    );

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    // Check if ingredient belongs to the company
    if (ingredient.companyId.toString() !== companyId) {
      throw new ForbiddenException('Ingredient does not belong to your company');
    }

    // Check if there's enough stock (optional - you might want to allow wastage even if stock is low)
    if (ingredient.currentStock < createWastageDto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Current stock: ${ingredient.currentStock} ${ingredient.unit}`,
      );
    }

    // Calculate total cost
    const totalCost =
      createWastageDto.quantity * (createWastageDto.unitCost || ingredient.unitCost || 0);

    // Create wastage record
    const wastage = new this.wastageModel({
      ...createWastageDto,
      companyId: new Types.ObjectId(companyId),
      branchId: new Types.ObjectId(branchId),
      ingredientId: new Types.ObjectId(createWastageDto.ingredientId),
      reportedBy: new Types.ObjectId(userId),
      totalCost,
      wastageDate: new Date(createWastageDto.wastageDate),
      expiryDate: createWastageDto.expiryDate
        ? new Date(createWastageDto.expiryDate)
        : undefined,
    });

    const savedWastage = await wastage.save();

    // Update ingredient stock and totalWastage
    await this.ingredientsService.adjustStock(createWastageDto.ingredientId, {
      type: 'wastage',
      quantity: createWastageDto.quantity,
      reason: `${createWastageDto.reason}: ${createWastageDto.notes || 'No notes'}`,
    });

    return savedWastage.populate([
      { path: 'ingredientId', select: 'name unit category' },
      { path: 'reportedBy', select: 'firstName lastName name email' },
      { path: 'branchId', select: 'name' },
    ]);
  }

  async findAll(
    queryDto: WastageQueryDto,
    companyId: string,
  ): Promise<{ wastages: Wastage[]; total: number; page: number; limit: number }> {
    const filter: any = {
      companyId: new Types.ObjectId(companyId),
    };

    if (queryDto.branchId) {
      filter.branchId = new Types.ObjectId(queryDto.branchId);
    }

    if (queryDto.ingredientId) {
      filter.ingredientId = new Types.ObjectId(queryDto.ingredientId);
    }

    if (queryDto.reason) {
      filter.reason = queryDto.reason;
    }

    if (queryDto.status) {
      filter.status = queryDto.status;
    }

    if (queryDto.startDate || queryDto.endDate) {
      filter.wastageDate = {};
      if (queryDto.startDate) {
        filter.wastageDate.$gte = new Date(queryDto.startDate);
      }
      if (queryDto.endDate) {
        const endDate = new Date(queryDto.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.wastageDate.$lte = endDate;
      }
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;

    const [wastages, total] = await Promise.all([
      this.wastageModel
        .find(filter)
        .populate('ingredientId', 'name unit category')
        .populate('reportedBy', 'firstName lastName name email')
        .populate('branchId', 'name')
        .populate('approvedBy', 'firstName lastName name email')
        .sort({ wastageDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.wastageModel.countDocuments(filter).exec(),
    ]);

    return {
      wastages,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, companyId: string): Promise<WastageDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wastage ID');
    }

    const wastage = await this.wastageModel
      .findOne({
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(companyId),
      })
      .populate('ingredientId', 'name unit category')
      .populate('reportedBy', 'firstName lastName name email')
      .populate('branchId', 'name')
      .populate('approvedBy', 'firstName lastName name email')
      .exec();

    if (!wastage) {
      throw new NotFoundException('Wastage record not found');
    }

    return wastage as WastageDocument;
  }

  async update(
    id: string,
    updateWastageDto: UpdateWastageDto,
    companyId: string,
    userId: string,
  ): Promise<WastageDocument> {
    const wastage = await this.findOne(id, companyId);

    // If status is being changed to approved/rejected, set approvedBy and approvedAt
    if (updateWastageDto.status && updateWastageDto.status !== wastage.status) {
      if (updateWastageDto.status === 'approved' || updateWastageDto.status === 'rejected') {
        updateWastageDto.approvedBy = userId;
        updateWastageDto.approvedAt = new Date();
      }
    }

    // If quantity is being updated, we need to adjust the ingredient stock
    if (updateWastageDto.quantity && updateWastageDto.quantity !== wastage.quantity) {
      const difference = updateWastageDto.quantity - wastage.quantity;
      
      // Update ingredient stock
      if (difference > 0) {
        // More wastage - reduce stock further
        await this.ingredientsService.adjustStock(wastage.ingredientId.toString(), {
          type: 'wastage',
          quantity: difference,
          reason: `Updated wastage record`,
        });
      } else {
        // Less wastage - add stock back
        await this.ingredientsService.adjustStock(wastage.ingredientId.toString(), {
          type: 'add',
          quantity: Math.abs(difference),
          reason: `Wastage record corrected`,
        });
      }
    }

    // Recalculate total cost if quantity or unitCost changed
    if (updateWastageDto.quantity || updateWastageDto.unitCost) {
      const quantity = updateWastageDto.quantity ?? wastage.quantity;
      const unitCost = updateWastageDto.unitCost ?? wastage.unitCost;
      updateWastageDto.totalCost = quantity * unitCost;
    }

    Object.assign(wastage, updateWastageDto);
    
    if (updateWastageDto.wastageDate) {
      wastage.wastageDate = new Date(updateWastageDto.wastageDate);
    }
    if (updateWastageDto.expiryDate) {
      wastage.expiryDate = new Date(updateWastageDto.expiryDate);
    }

    return wastage.save();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const wastage = await this.findOne(id, companyId);

    // Restore stock when deleting wastage record
    await this.ingredientsService.adjustStock(wastage.ingredientId.toString(), {
      type: 'add',
      quantity: wastage.quantity,
      reason: 'Wastage record deleted - stock restored',
    });

    await this.wastageModel.deleteOne({ _id: wastage._id });
  }

  async getWastageStats(
    branchId?: string,
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const filter: any = {};

    if (companyId) {
      filter.companyId = new Types.ObjectId(companyId);
    }

    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId);
    }

    if (startDate || endDate) {
      filter.wastageDate = {};
      if (startDate) {
        filter.wastageDate.$gte = startDate;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.wastageDate.$lte = end;
      }
    }

    // Aggregate wastage statistics
    const stats = await this.wastageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalWastageCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          avgWastageCost: { $avg: '$totalCost' },
          byReason: {
            $push: {
              reason: '$reason',
              quantity: '$quantity',
              cost: '$totalCost',
            },
          },
        },
      },
    ]);

    // Group by reason
    const byReason = await this.wastageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);

    // Group by ingredient
    const byIngredient = await this.wastageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$ingredientId',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
        },
      },
      { $sort: { totalCost: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'ingredients',
          localField: '_id',
          foreignField: '_id',
          as: 'ingredient',
        },
      },
      { $unwind: { path: '$ingredient', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ingredientId: '$_id',
          ingredientName: '$ingredient.name',
          ingredientUnit: '$ingredient.unit',
          count: 1,
          totalQuantity: 1,
          totalCost: 1,
        },
      },
    ]);

    // Daily wastage trend
    const dailyTrend = await this.wastageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$wastageDate' },
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      summary: stats[0] || {
        totalWastageCount: 0,
        totalQuantity: 0,
        totalCost: 0,
        avgWastageCost: 0,
      },
      byReason,
      byIngredient,
      dailyTrend,
    };
  }
}

