import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if email already exists
    const existingCompany = await this.companyModel.findOne({
      email: createCompanyDto.email.toLowerCase(),
    });

    if (existingCompany) {
      throw new BadRequestException('Company with this email already exists');
    }

    // Get subscription plan details
    const subscriptionPlan = await this.subscriptionPlansService.findByName(
      createCompanyDto.subscriptionPlan || 'basic',
    );

    // Set trial period based on subscription plan
    // Use millisecond-based calculation for precision and consistency
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + (subscriptionPlan.trialPeriod * 60 * 60 * 1000));

    // Generate unique slug if not provided
    let slug = (createCompanyDto as any).slug || GeneratorUtil.generateSlug(createCompanyDto.name);
    if (!(createCompanyDto as any).slug) {
      const existingSlugs = await this.companyModel.find({ slug: { $exists: true } })
        .select('slug')
        .lean();
      const slugsList = existingSlugs.map((c: any) => c.slug).filter(Boolean);
      slug = GeneratorUtil.generateUniqueSlug(createCompanyDto.name, slugsList);
    }

    const company = new this.companyModel({
      ...createCompanyDto,
      email: createCompanyDto.email.toLowerCase(),
      slug,
      subscriptionStatus: 'trial',
      trialEndDate,
      subscriptionStartDate: new Date(),
      settings: {
        currency: 'BDT', // Bangladesh Taka
        language: 'en',
        features: subscriptionPlan.features,
      },
    });

    return company.save();
  }

  async findAll(filter: any = {}): Promise<Company[]> {
    // NOTE:
    // Super admin listing & system dashboards don't strictly need populated owner data,
    // and older records may contain invalid / empty ownerId values which can cause
    // Mongoose to throw "Cast to ObjectId failed" errors when populating the User model.
    //
    // To make this endpoint robust (and avoid 500s on `/companies` for super admin),
    // we return plain companies here without populate. If/when owner details are needed
    // in specific views, those endpoints can perform a safer populate with validation.
    return this.companyModel.find(filter).lean().exec();
  }

  async findOne(id: string): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel
      .findById(id)
      .populate('ownerId', 'firstName lastName email')
      .select('+subscriptionStatus +subscriptionPlan +trialEndDate +subscriptionEndDate')
      .lean();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Log logo for debugging
    console.log('Company findOne - Logo:', {
      companyId: id,
      hasLogo: !!company.logo,
      logoValue: company.logo?.substring(0, 50) + '...' || 'null',
    });

    // Return company with subscription data (logo should be included automatically)
    return company as any;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyModel
      .findOne({ slug })
      .populate('ownerId', 'firstName lastName email')
      .lean();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company as any;
  }

  async findByOwner(ownerId: string): Promise<Company[]> {
    return this.companyModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  async findByEmail(email: string): Promise<Company | null> {
    if (!email) {
      return null;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Try exact match first (case-insensitive)
    let company = await this.companyModel.findOne({ 
      email: normalizedEmail 
    }).exec();
    
    // If not found, try case-insensitive regex search (in case of any whitespace or casing issues)
    if (!company) {
      company = await this.companyModel.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).exec();
    }
    
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel
      .findByIdAndUpdate(id, updateCompanyDto, { new: true })
      .populate('ownerId', 'firstName lastName email');

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async updateSettings(id: string, settings: any): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel
      .findByIdAndUpdate(
        id,
        { $set: { settings } },
        { new: true }
      )
      .populate('ownerId', 'firstName lastName email');

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async deactivate(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const result = await this.companyModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Company not found');
    }
  }

  async getStats(id: string): Promise<any> {
    // In some dashboard contexts (especially super-admin views), the frontend
    // may call this endpoint with an empty or placeholder ID when there is no
    // specific company selected yet. Instead of throwing a 400 error that can
    // break the UI, gracefully return default stats.
    if (!id || !Types.ObjectId.isValid(id)) {
      return {
        company: null,
        stats: {
          totalBranches: 0,
          totalUsers: 0,
          totalCustomers: 0,
          totalOrders: 0,
          totalRevenue: 0,
        },
      };
    }

    const companyId = new Types.ObjectId(id);

    // Fetch company details
    const company = await this.findOne(id);

    // Get all branch IDs for this company first
    // Try both ObjectId and string formats for compatibility
    const [branchesWithObjectId, branchesWithString] = await Promise.all([
      this.branchModel.find({ companyId }).select('_id').lean().exec(),
      this.branchModel.find({ companyId: id }).select('_id').lean().exec(),
    ]);
    
    // Combine and deduplicate branches
    const allBranchIds = new Set<string>();
    [...branchesWithObjectId, ...branchesWithString].forEach((b: any) => {
      const branchId = b._id?.toString() || b._id;
      if (branchId) allBranchIds.add(branchId.toString());
    });
    
    const branchIds = Array.from(allBranchIds).map(branchIdStr => new Types.ObjectId(branchIdStr));
    const totalBranchesCount = allBranchIds.size;

    // Aggregate related stats in parallel for performance
    const [totalBranches, totalUsers, totalCustomers, ordersAgg] = await Promise.all([
      // Count branches
      Promise.resolve(totalBranchesCount),
      // Count users (employees/staff) - try both ObjectId and string formats for compatibility
      Promise.all([
        this.userModel.countDocuments({ companyId }).exec(),
        this.userModel.countDocuments({ companyId: id }).exec(),
      ]).then(([count1, count2]) => Math.max(count1, count2)),
      // Count customers - try both ObjectId and string formats for compatibility
      Promise.all([
        this.customerModel.countDocuments({ companyId }).exec(),
        this.customerModel.countDocuments({ companyId: id }).exec(),
      ]).then(([count1, count2]) => Math.max(count1, count2)),
      // Aggregate orders from all branches - POS orders only have branchId, not companyId
      branchIds.length > 0
        ? this.posOrderModel
            .aggregate([
              {
                $match: {
                  branchId: { $in: branchIds },
                },
              },
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        { $in: ['$status', ['paid', 'completed']] },
                        { $ifNull: ['$totalAmount', 0] },
                        0,
                      ],
                    },
                  },
                },
              },
            ])
            .exec()
        : Promise.resolve([]),
    ]);

    const ordersStats =
      ordersAgg && Array.isArray(ordersAgg) && ordersAgg.length > 0
        ? {
            totalOrders: ordersAgg[0].totalOrders || 0,
            totalRevenue: ordersAgg[0].totalRevenue || 0,
          }
        : { totalOrders: 0, totalRevenue: 0 };

    return {
      company,
      stats: {
        totalBranches,
        totalUsers, // Employees/Staff count
        totalCustomers, // Customers count
        totalOrders: ordersStats.totalOrders,
        totalRevenue: ordersStats.totalRevenue,
      },
    };
  }

  async getSystemStats(): Promise<any> {
    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      expiredCompanies,
      companiesByPlan,
    ] = await Promise.all([
      this.companyModel.countDocuments().exec(),
      this.companyModel.countDocuments({ subscriptionStatus: 'active' }).exec(),
      this.companyModel.countDocuments({ subscriptionStatus: 'trial' }).exec(),
      this.companyModel.countDocuments({ subscriptionStatus: 'expired' }).exec(),
      this.companyModel.aggregate([
        {
          $group: {
            _id: '$subscriptionPlan',
            count: { $sum: 1 },
          },
        },
      ]).exec(),
    ]);

    return {
      totalCompanies,
      activeCompanies,
      trialCompanies,
      expiredCompanies,
      companiesByPlan: companiesByPlan.reduce((acc: any, item: any) => {
        acc[item._id || 'none'] = item.count;
        return acc;
      }, {}),
    };
  }
}

