import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AddCustomDomainDto } from './dto/add-custom-domain.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { VerifyCustomDomainDto } from './dto/verify-custom-domain.dto';
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
    // Validate input
    if (!slug || typeof slug !== 'string') {
      throw new BadRequestException('Invalid slug provided');
    }

    // Normalize slug: lowercase and trim to match schema behavior
    const normalizedSlug = slug.toLowerCase().trim();
    
    if (!normalizedSlug) {
      throw new BadRequestException('Slug cannot be empty');
    }

    const company = await this.companyModel
      .findOne({ slug: normalizedSlug })
      .populate('ownerId', 'firstName lastName email')
      .lean();

    if (!company) {
      throw new NotFoundException(`Company with slug "${normalizedSlug}" not found`);
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

    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Handle slug update with validation
    if ((updateCompanyDto as any).slug !== undefined) {
      let newSlug = (updateCompanyDto as any).slug;
      
      // If slug is provided, validate and ensure uniqueness
      if (newSlug) {
        // Sanitize slug
        newSlug = GeneratorUtil.generateSlug(newSlug);
        
        if (!newSlug) {
          throw new BadRequestException('Invalid slug format. Slug cannot be empty after sanitization.');
        }

        // Check uniqueness (exclude current company)
        const existingCompany = await this.companyModel.findOne({ 
          slug: newSlug,
          _id: { $ne: id }
        });
        
        if (existingCompany) {
          throw new BadRequestException(`Slug "${newSlug}" is already taken by another company.`);
        }
        
        (updateCompanyDto as any).slug = newSlug;
      } else {
        // If slug is being removed or set to empty, generate one from company name
        const companyName = (updateCompanyDto as any).name || company.name;
        const existingSlugs = await this.companyModel.find({ slug: { $exists: true } })
          .select('slug')
          .lean();
        const slugsList = existingSlugs.map((c: any) => c.slug).filter(Boolean);
        const autoSlug = GeneratorUtil.generateUniqueSlug(companyName, slugsList);
        (updateCompanyDto as any).slug = autoSlug;
      }
    } else if (!company.slug) {
      // Generate slug if company doesn't have one
      const existingSlugs = await this.companyModel.find({ slug: { $exists: true } })
        .select('slug')
        .lean();
      const slugsList = existingSlugs.map((c: any) => c.slug).filter(Boolean);
      const autoSlug = GeneratorUtil.generateUniqueSlug(company.name, slugsList);
      (updateCompanyDto as any).slug = autoSlug;
    }

    const updatedCompany = await this.companyModel
      .findByIdAndUpdate(id, updateCompanyDto, { new: true })
      .populate('ownerId', 'firstName lastName email');

    if (!updatedCompany) {
      throw new NotFoundException('Company not found');
    }

    return updatedCompany;
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

  async activate(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { isActive: true },
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
    const now = new Date();
    
    const [
      totalCompanies,
      allCompanies,
      totalUsers,
      companiesByPlan,
    ] = await Promise.all([
      this.companyModel.countDocuments().exec(),
      this.companyModel.find({}).select('subscriptionStatus trialEndDate').lean().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.companyModel.aggregate([
        {
          $group: {
            _id: '$subscriptionPlan',
            count: { $sum: 1 },
          },
        },
      ]).exec(),
    ]);

    // Calculate active and trial companies based on subscriptionStatus and trialEndDate
    // A company is "trial" if subscriptionStatus is 'trial' AND has a valid trialEndDate in the future
    // A company is "active" if subscriptionStatus is 'active' (regardless of trialEndDate)
    // A company is "expired" if subscriptionStatus is 'expired' OR trial has ended
    let activeCompanies = 0;
    let trialCompanies = 0;
    let expiredCompanies = 0;

    for (const company of allCompanies) {
      const status = company.subscriptionStatus?.toLowerCase() || null;
      const trialEndDate = company.trialEndDate ? new Date(company.trialEndDate) : null;
      const isTrialActive = trialEndDate && trialEndDate > now;

      if (status === 'active') {
        // Company has active subscription (paid)
        activeCompanies++;
      } else if (status === 'trial') {
        if (isTrialActive) {
          // Trial is still active
          trialCompanies++;
        } else {
          // Trial has expired
          expiredCompanies++;
        }
      } else if (status === 'expired' || status === 'cancelled' || status === 'inactive') {
        // Explicitly expired, cancelled, or inactive
        expiredCompanies++;
      } else {
        // No status or unknown status - treat as expired/inactive
        expiredCompanies++;
      }
    }

    return {
      totalCompanies,
      activeCompanies,
      trialCompanies,
      expiredCompanies,
      totalUsers,
      companiesByPlan: companiesByPlan.reduce((acc: any, item: any) => {
        acc[item._id || 'none'] = item.count;
        return acc;
      }, {}),
    };
  }

  async addCustomDomain(companyId: string, addDomainDto: AddCustomDomainDto): Promise<Company> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if domain is already taken by another company
    const existingCompany = await this.companyModel.findOne({
      customDomain: addDomainDto.domain.toLowerCase(),
      _id: { $ne: companyId },
    });

    if (existingCompany) {
      throw new BadRequestException('This domain is already in use by another company');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenValue = `domain-verification-${verificationToken}`;

    // Update company with custom domain
    company.customDomain = addDomainDto.domain.toLowerCase();
    company.domainVerified = false;
    company.domainVerificationToken = tokenValue;
    company.domainVerifiedAt = undefined;

    await company.save();

    return company.toObject();
  }

  async verifyCustomDomain(companyId: string, verifyDto: VerifyCustomDomainDto): Promise<Company> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.customDomain) {
      throw new BadRequestException('No custom domain configured for this company');
    }

    if (!company.domainVerificationToken) {
      throw new BadRequestException('No verification token found. Please add the domain again.');
    }

    // Verify token matches
    if (company.domainVerificationToken !== verifyDto.token) {
      throw new BadRequestException('Invalid verification token');
    }

    // Mark domain as verified
    company.domainVerified = true;
    company.domainVerifiedAt = new Date();

    await company.save();

    return company.toObject();
  }

  async removeCustomDomain(companyId: string): Promise<Company> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Remove custom domain
    company.customDomain = undefined;
    company.domainVerified = false;
    company.domainVerificationToken = undefined;
    company.domainVerifiedAt = undefined;

    await company.save();

    return company.toObject();
  }

  async getCustomDomainInfo(companyId: string) {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel.findById(companyId).select('customDomain domainVerified domainVerificationToken domainVerifiedAt').lean();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      domain: company.customDomain || null,
      verified: company.domainVerified || false,
      verificationToken: company.domainVerificationToken || null,
      verifiedAt: company.domainVerifiedAt || null,
      dnsInstructions: company.customDomain && !company.domainVerified ? {
        recordType: 'TXT',
        recordName: company.customDomain,
        recordValue: company.domainVerificationToken,
        instructions: `Add a TXT record to your DNS settings for ${company.customDomain} with the value: ${company.domainVerificationToken}`,
      } : null,
    };
  }
}

