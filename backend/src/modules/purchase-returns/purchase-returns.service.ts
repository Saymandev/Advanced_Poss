import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePurchaseReturnDto, UpdatePurchaseReturnDto } from './dto/purchase-return.dto';
import { PurchaseReturn, PurchaseReturnDocument } from './schemas/purchase-return.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../purchase-orders/schemas/purchase-order.schema';

@Injectable()
export class PurchaseReturnsService {
  constructor(
    @InjectModel(PurchaseReturn.name)
    private model: Model<PurchaseReturnDocument>,
    @InjectModel(PurchaseOrder.name)
    private poModel: Model<PurchaseOrderDocument>,
  ) {}

  async create(dto: CreatePurchaseReturnDto, companyId: string, userId: string): Promise<PurchaseReturn> {
    if (!dto.purchaseOrderId) {
      throw new BadRequestException('A Purchase Order ID is required to create a return.');
    }

    const po = await this.poModel.findById(dto.purchaseOrderId);
    if (!po) {
      throw new NotFoundException('Purchase Order not found.');
    }

    for (const item of dto.items) {
      const poItem = po.items.find(poi => poi.ingredientId.toString() === item.productId);
      if (!poItem) {
        throw new BadRequestException(`Item with ID ${item.productId} was not found in the original Purchase Order.`);
      }
      
      // Enforce the original PO unit cost to prevent manual pricing fraud
      item.unitCost = poItem.unitPrice;

      if (item.quantity > poItem.quantity) {
        throw new BadRequestException(`Cannot return more than the purchased quantity for item ${item.productId}. Purchased: ${poItem.quantity}`);
      }
    }

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
