import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name)
    private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Check if supplier with same email exists
    const existingSupplier = await this.supplierModel.findOne({
      companyId: new Types.ObjectId(createSupplierDto.companyId),
      email: createSupplierDto.email,
    });

    if (existingSupplier) {
      throw new BadRequestException(
        'Supplier with this email already exists',
      );
    }

    const supplier = new this.supplierModel(createSupplierDto);
    return supplier.save();
  }

  async findAll(filter: any = {}): Promise<Supplier[]> {
    return this.supplierModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findById(id);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async findByCompany(companyId: string): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
      })
      .sort({ name: 1 })
      .exec();
  }

  async findByType(companyId: string, type: string): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        companyId: new Types.ObjectId(companyId),
        type,
        isActive: true,
      })
      .sort({ name: 1 })
      .exec();
  }

  async findPreferred(companyId: string): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isPreferred: true,
        isActive: true,
      })
      .sort({ rating: -1 })
      .exec();
  }

  async search(companyId: string, query: string): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        companyId: new Types.ObjectId(companyId),
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { code: { $regex: query, $options: 'i' } },
          { contactPerson: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
        isActive: true,
      })
      .limit(20)
      .exec();
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      updateSupplierDto,
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async updateRating(id: string, rating: number): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      { rating },
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async makePreferred(id: string): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      { isPreferred: true },
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async removePreferred(id: string): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      { isPreferred: false },
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async updateBalance(id: string, amount: number): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findById(id);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    supplier.currentBalance += amount;

    return supplier.save();
  }

  async recordOrder(id: string, orderAmount: number): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findById(id);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    supplier.totalOrders += 1;
    supplier.totalPurchases += orderAmount;
    supplier.lastOrderDate = new Date();

    if (!supplier.firstOrderDate) {
      supplier.firstOrderDate = new Date();
    }

    return supplier.save();
  }

  async deactivate(id: string): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      {
        isActive: false,
        deactivatedAt: new Date(),
      },
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async activate(id: string): Promise<Supplier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findByIdAndUpdate(
      id,
      {
        isActive: true,
        deactivatedAt: null,
      },
      { new: true },
    );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const result = await this.supplierModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Supplier not found');
    }
  }

  async getStats(companyId: string): Promise<any> {
    const suppliers = await this.supplierModel.find({
      companyId: new Types.ObjectId(companyId),
    });

    const active = suppliers.filter((s) => s.isActive);
    const preferred = suppliers.filter((s) => s.isPreferred);

    const totalPurchases = active.reduce((sum, s) => sum + s.totalPurchases, 0);
    const totalOrders = active.reduce((sum, s) => sum + s.totalOrders, 0);

    // Group by type
    const byType = {};
    suppliers.forEach((supplier) => {
      if (!byType[supplier.type]) {
        byType[supplier.type] = {
          count: 0,
          totalPurchases: 0,
        };
      }
      byType[supplier.type].count += 1;
      byType[supplier.type].totalPurchases += supplier.totalPurchases;
    });

    // Top suppliers
    const topSuppliers = active
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5)
      .map((s) => ({
        id: s._id,
        name: s.name,
        totalPurchases: s.totalPurchases,
        totalOrders: s.totalOrders,
        rating: s.rating,
      }));

    return {
      total: suppliers.length,
      active: active.length,
      inactive: suppliers.length - active.length,
      preferred: preferred.length,
      totalPurchases,
      totalOrders,
      averagePurchasePerSupplier:
        active.length > 0 ? totalPurchases / active.length : 0,
      byType,
      topSuppliers,
    };
  }

  async getPerformanceReport(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findById(id);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const averageOrderValue =
      supplier.totalOrders > 0
        ? supplier.totalPurchases / supplier.totalOrders
        : 0;

    const daysSinceFirstOrder = supplier.firstOrderDate
      ? Math.floor(
          (Date.now() - supplier.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      supplier: {
        id: supplier._id,
        name: supplier.name,
        code: supplier.code,
        type: supplier.type,
      },
      performance: {
        totalOrders: supplier.totalOrders,
        totalPurchases: supplier.totalPurchases,
        averageOrderValue,
        currentBalance: supplier.currentBalance,
        rating: supplier.rating,
        onTimeDeliveryRate: supplier.onTimeDeliveryRate,
        qualityScore: supplier.qualityScore,
      },
      timeline: {
        firstOrderDate: supplier.firstOrderDate,
        lastOrderDate: supplier.lastOrderDate,
        daysSinceFirstOrder,
      },
      status: {
        isActive: supplier.isActive,
        isPreferred: supplier.isPreferred,
      },
    };
  }
}

