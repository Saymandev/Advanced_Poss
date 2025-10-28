import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { CompaniesService } from '../companies/companies.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
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

  async findAll(filter: any = {}): Promise<Branch[]> {
    return this.branchModel
      .find(filter)
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email')
      .exec();
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

    // TODO: Aggregate stats from orders, tables, etc.
    return {
      branch,
      stats: {
        totalTables: branch.totalTables || 0,
        totalSeats: branch.totalSeats || 0,
        totalStaff: 0,
        totalOrders: 0,
        todayRevenue: 0,
      },
    };
  }
}

