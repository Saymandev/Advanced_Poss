import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BranchFilterDto } from '../../common/dto/pagination.dto';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { CompaniesService } from '../companies/companies.service';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    private companiesService: CompaniesService,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    // Verify company exists
    const company = await this.companiesService.findOne(createBranchDto.companyId);

    // Check subscription limits for multi-branch feature
    if (company.subscriptionPlan) {
      const plan = await this.subscriptionPlansService.findByName(company.subscriptionPlan);
      if (plan) {
        // Check if multi-branch is enabled
        if (!plan.features.multiBranch) {
          throw new BadRequestException('Multi-branch feature is not available in your current plan. Please upgrade to create additional branches.');
        }

        // Check branch limit
        if (plan.features.maxBranches !== -1) {
          const existingBranches = await this.branchModel.countDocuments({ companyId: createBranchDto.companyId });
          if (existingBranches >= plan.features.maxBranches) {
            throw new BadRequestException(
              `You have reached the maximum branch limit (${plan.features.maxBranches}) for your ${plan.displayName} plan. Please upgrade to create more branches.`
            );
          }
        }
      }
    }

    // Generate unique branch code
    const code = GeneratorUtil.generateBranchCode(company.name);

    // Generate unique slug if not provided
    let slug = (createBranchDto as any).slug || GeneratorUtil.generateSlug(createBranchDto.name);
    if (!(createBranchDto as any).slug) {
      const existingBranches = await this.branchModel.find({ 
        companyId: createBranchDto.companyId,
        slug: { $exists: true }
      }).select('slug').lean();
      const slugsList = existingBranches.map((b: any) => b.slug).filter(Boolean);
      slug = GeneratorUtil.generateUniqueSlug(createBranchDto.name, slugsList);
    }

    // Auto-generate publicUrl if not provided (using company slug + branch slug)
    let publicUrl = createBranchDto.publicUrl;
    if (!publicUrl && company.slug && slug) {
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      publicUrl = `${baseUrl}/${company.slug}/${slug}`;
    }

    // Set default opening hours if not provided
    const defaultOpeningHours = [
      { day: 'monday', open: '09:00', close: '22:00', isClosed: false },
      { day: 'tuesday', open: '09:00', close: '22:00', isClosed: false },
      { day: 'wednesday', open: '09:00', close: '22:00', isClosed: false },
      { day: 'thursday', open: '09:00', close: '22:00', isClosed: false },
      { day: 'friday', open: '09:00', close: '23:00', isClosed: false },
      { day: 'saturday', open: '09:00', close: '23:00', isClosed: false },
      { day: 'sunday', open: '10:00', close: '21:00', isClosed: false },
    ];

    const branch = new this.branchModel({
      ...createBranchDto,
      code,
      slug,
      publicUrl,
      openingHours: createBranchDto.openingHours || defaultOpeningHours,
      settings: {
        autoAcceptOrders: true,
        printReceipts: true,
        allowTips: true,
        defaultTipPercentage: 10,
      },
    });

    return branch.save();
  }

  async findAll(
    filter: BranchFilterDto,
  ): Promise<{ branches: Branch[]; total: number; page: number; limit: number }> {
    const query: Record<string, any> = {};

    if (filter.companyId) {
      query.companyId = filter.companyId;
    }

    if (filter.status === 'active') {
      query.isActive = true;
    } else if (filter.status === 'inactive') {
      query.isActive = false;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { 'address.street': searchRegex },
        { 'address.city': searchRegex },
        { 'address.state': searchRegex },
      ];
    }

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit =
      filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const [branches, total] = await Promise.all([
      this.branchModel
        .find(query)
        .populate('companyId', 'name email')
        .populate('managerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.branchModel.countDocuments(query),
    ]);

    return {
      branches: branches as any,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel
      .findById(id)
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email');

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async findBySlug(companyId: string, branchSlug: string): Promise<Branch> {
    const branch = await this.branchModel
      .findOne({ 
        companyId: new Types.ObjectId(companyId),
        slug: branchSlug
      })
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email')
      .lean();

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch as any;
  }

  async findByCompany(companyId: string): Promise<Branch[]> {
    return this.branchModel
      .find({ companyId: companyId })
      .populate('managerId', 'firstName lastName email')
      .exec();
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel
      .findByIdAndUpdate(id, updateBranchDto, { new: true })
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email');

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async updateSettings(id: string, settings: any): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel
      .findByIdAndUpdate(
        id,
        { $set: { settings } },
        { new: true }
      )
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email');

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async deactivate(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  async toggleStatus(id: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findById(id);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    branch.isActive = !branch.isActive;
    return branch.save();
  }

  async updatePublicUrl(id: string, publicUrl: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findByIdAndUpdate(
      id,
      { publicUrl },
      { new: true }
    )
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email');

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const result = await this.branchModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Branch not found');
    }
  }

  async getStats(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.findOne(id);
    const branchObjectId = new Types.ObjectId(id);

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get actual counts from database
    // Tables store branchId as string, so we query with both formats to be safe
    const branchIdString = id.toString();
    
    // Query tables - try string first (most common), then ObjectId
    const [tablesWithString, tablesWithObjectId] = await Promise.all([
      this.tableModel.find({ branchId: branchIdString }).lean(),
      this.tableModel.find({ branchId: branchObjectId }).lean(),
    ]);
    
    // Use whichever query found tables (string format is preferred)
    const actualTablesCount = tablesWithString.length || tablesWithObjectId.length;
    
    // Query users and orders - try both formats for consistency
    const [usersWithString, usersWithObjectId, ordersWithString, ordersWithObjectId, todayOrders] = await Promise.all([
      this.userModel.countDocuments({ branchId: branchIdString }),
      this.userModel.countDocuments({ branchId: branchObjectId }),
      this.posOrderModel.countDocuments({ branchId: branchIdString, status: { $ne: 'cancelled' } }),
      this.posOrderModel.countDocuments({ branchId: branchObjectId, status: { $ne: 'cancelled' } }),
      this.posOrderModel.find({
        $or: [
          { branchId: branchIdString },
          { branchId: branchObjectId },
        ],
        status: { $ne: 'cancelled' },
        createdAt: { $gte: today, $lt: tomorrow },
      }).lean(),
    ]);
    
    // Use whichever query found more results
    const actualUsersCount = Math.max(usersWithString, usersWithObjectId);
    const totalOrdersCount = Math.max(ordersWithString, ordersWithObjectId);

    // Calculate today's revenue
    const todayRevenue = todayOrders.reduce((sum, order) => {
      return sum + (Number(order.totalAmount) || 0);
    }, 0);

    return {
      branch,
      stats: {
        totalTables: branch.totalTables || 0,
        totalSeats: branch.totalSeats || 0,
        totalStaff: actualUsersCount,
        totalOrders: totalOrdersCount,
        todayRevenue,
        actualTablesCount,
        actualUsersCount,
      },
    };
  }
}

