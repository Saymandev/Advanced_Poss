import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
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
    const trialEndDate = new Date();
    trialEndDate.setHours(trialEndDate.getHours() + subscriptionPlan.trialPeriod);

    const company = new this.companyModel({
      ...createCompanyDto,
      email: createCompanyDto.email.toLowerCase(),
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
    return this.companyModel.find(filter).populate('ownerId', 'firstName lastName email').exec();
  }

  async findOne(id: string): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.companyModel
      .findById(id)
      .populate('ownerId', 'firstName lastName email');

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findByOwner(ownerId: string): Promise<Company[]> {
    return this.companyModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  async findByEmail(email: string): Promise<Company | null> {
    return this.companyModel.findOne({ email: email.toLowerCase() }).exec();
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
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company ID');
    }

    const company = await this.findOne(id);

    // TODO: Aggregate stats from branches, orders, etc.
    return {
      company,
      stats: {
        totalBranches: 0,
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
      },
    };
  }
}

