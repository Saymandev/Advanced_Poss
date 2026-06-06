import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePurchaseReturnDto, UpdatePurchaseReturnDto } from './dto/purchase-return.dto';
import { PurchaseReturn, PurchaseReturnDocument } from './schemas/purchase-return.schema';

@Injectable()
export class PurchaseReturnsService {
  constructor(
    @InjectModel(PurchaseReturn.name)
    private model: Model<PurchaseReturnDocument>,
  ) {}

  async create(dto: CreatePurchaseReturnDto, companyId: string, userId: string): Promise<PurchaseReturn> {
    const totalAmount = dto.items.reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);
    const returnNumber = await this.generateReturnNumber(companyId);

    const doc = new this.model({
      ...dto,
      returnNumber,
      companyId: new Types.ObjectId(companyId),
      branchId: new Types.ObjectId(dto.branchId),
      supplierId: dto.supplierId ? new Types.ObjectId(dto.supplierId) : undefined,
      purchaseOrderId: dto.purchaseOrderId ? new Types.ObjectId(dto.purchaseOrderId) : undefined,
      totalAmount,
      status: 'pending',
      createdBy: new Types.ObjectId(userId),
      items: dto.items.map(item => ({
        ...item,
        productId: new Types.ObjectId(item.productId),
      })),
    });

    return doc.save();
  }

  async findAll(filters: {
    companyId: string;
    branchId?: string;
    status?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ returns: PurchaseReturn[]; total: number }> {
    const query: any = { companyId: new Types.ObjectId(filters.companyId) };
    if (filters.branchId) query.branchId = new Types.ObjectId(filters.branchId);
    if (filters.status) query.status = filters.status;
    if (filters.supplierId) query.supplierId = new Types.ObjectId(filters.supplierId);

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [returns, total] = await Promise.all([
      this.model.find(query)
        .populate('supplierId', 'name email phone')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('items.productId', 'name sku barcode')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(query),
    ]);

    const normalizedReturns = returns.map((r: any) => ({
      ...r,
      id: r._id.toString(),
    }));

    return { returns: normalizedReturns as any, total };
  }

  async findOne(id: string): Promise<PurchaseReturn> {
    const doc = await this.model.findById(id)
      .populate('supplierId', 'name email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('items.productId', 'name sku barcode')

    if (!doc) throw new NotFoundException('Purchase return not found');
    return doc;
  }

  async update(id: string, dto: UpdatePurchaseReturnDto, userId: string): Promise<PurchaseReturn> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Purchase return not found');

    if (dto.status === 'approved' || dto.status === 'rejected') {
      doc.approvedBy = new Types.ObjectId(userId);
    }

    if (dto.status === 'settled') {
      doc.settlementDate = new Date();
    }

    Object.assign(doc, dto);
    return doc.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Purchase return not found');
  }

  private async generateReturnNumber(companyId: string): Promise<string> {
    const date = new Date();
    const prefix = `PR-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await this.model.countDocuments({
      companyId: new Types.ObjectId(companyId),
      returnNumber: { $regex: `^${prefix}` },
    });
    return `${prefix}-${(count + 1).toString().padStart(3, '0')}`;
  }
}
