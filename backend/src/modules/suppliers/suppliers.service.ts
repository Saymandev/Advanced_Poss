import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupplierFilterDto } from '../../common/dto/pagination.dto';
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
    // Ensure companyId is converted to ObjectId
    const supplierData = {
      ...createSupplierDto,
      companyId: new Types.ObjectId(createSupplierDto.companyId),
    };
    const supplier = new this.supplierModel(supplierData);
    const savedSupplier = await supplier.save();
    // Convert to plain object to ensure proper serialization
    return savedSupplier.toObject ? savedSupplier.toObject() : savedSupplier;
  }
  async findAll(filterDto: SupplierFilterDto & { isActive?: boolean; rating?: number }): Promise<{ suppliers: Supplier[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      companyId,
      type,
      status,
      isActive,
      rating,
      ...filters 
    } = filterDto;
    const skip = (page - 1) * limit;
    const query: any = {};
    // Convert companyId to ObjectId if provided
    // IMPORTANT: If companyId is not provided, we should not filter by it
    // This allows fetching all suppliers when companyId is not specified
    if (companyId) {
      if (Types.ObjectId.isValid(companyId)) {
        query.companyId = new Types.ObjectId(companyId);
      } else {
        // If companyId is provided but invalid, return empty results
        return {
          suppliers: [],
          total: 0,
          page,
          limit,
        };
      }
    }
    // Add other filters
    if (type) {
      query.type = type;
    }
    // Handle isActive filter (prefer boolean over status string)
    if (isActive !== undefined) {
      query.isActive = isActive;
    } else if (status) {
      if (status === 'active' || status === 'true') {
        query.isActive = true;
      } else if (status === 'inactive' || status === 'false') {
        query.isActive = false;
      }
    }
    // Handle rating filter
    if (rating !== undefined) {
      query.rating = rating;
    }
    // Add search functionality
    // Note: When using $or with other query conditions, we need to combine them properly
    if (search) {
      const searchConditions = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { contactPerson: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      };
      // If we have other query conditions, combine them with $and
      if (Object.keys(query).length > 0) {
        query.$and = [
          { ...query },
          searchConditions,
        ];
        // Remove $or from top level if it exists
        delete query.$or;
      } else {
        Object.assign(query, searchConditions);
      }
    }
    
    if (search) {
      const searchConditions = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ];
      // If we have other query conditions, combine with $and
      if (Object.keys(query).length > 0) {
        query.$and = [
          ...(query.$and || []),
          { $or: searchConditions }
        ];
        // Remove $or if it was set directly
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    try {
      
      const suppliers = await this.supplierModel
        .find(query)
        .populate('companyId', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean() // Use lean() to get plain JavaScript objects instead of Mongoose documents
        .exec();
      const total = await this.supplierModel.countDocuments(query);
      return {
        suppliers,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      console.error('Query that caused error:', JSON.stringify(query, null, 2));
      throw new BadRequestException(
        `Failed to fetch suppliers: ${error.message || 'Unknown error'}`
      );
    }
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
