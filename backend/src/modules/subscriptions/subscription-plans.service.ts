import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) {}

  async create(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const existingPlan = await this.subscriptionPlanModel.findOne({
      name: createDto.name,
    });

    if (existingPlan) {
      throw new BadRequestException('Subscription plan with this name already exists');
    }

    const plan = new this.subscriptionPlanModel({
      ...createDto,
      currency: 'BDT', // Always BDT for Bangladesh
    });

    return plan.save();
  }

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanModel
      .find({ isActive: true })
      .sort({ sortOrder: 1 })
      .exec();
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findById(id);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return plan;
  }

  async findByName(name: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findOne({ name });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return plan;
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findByIdAndUpdate(
      id,
      updateDto,
      { new: true },
    );

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async remove(id: string): Promise<void> {
    const result = await this.subscriptionPlanModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Subscription plan not found');
    }
  }

  // Initialize default subscription plans
  async initializeDefaultPlans(): Promise<void> {
    const existingPlans = await this.subscriptionPlanModel.countDocuments();
    if (existingPlans > 0) return; // Already initialized

    const defaultPlans = [
      {
        name: 'basic',
        displayName: 'Basic',
        description: 'Perfect for small businesses getting started',
        price: 0, // Free trial
        currency: 'BDT',
        billingCycle: 'monthly',
        trialPeriod: 12, // 12 hours
        features: {
          pos: true,
          inventory: false,
          crm: false,
          accounting: false,
          aiInsights: false,
          multiBranch: false,
          maxUsers: 2,
          maxBranches: 1,
        },
        stripePriceId: 'price_basic_trial',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'premium',
        displayName: 'Premium',
        description: 'Advanced features for growing businesses',
        price: 2500, // ৳2,500/month
        currency: 'BDT',
        billingCycle: 'monthly',
        trialPeriod: 168, // 7 days
        features: {
          pos: true,
          inventory: true,
          crm: true,
          accounting: true,
          aiInsights: false,
          multiBranch: true,
          maxUsers: 10,
          maxBranches: 5,
        },
        stripePriceId: 'price_premium_monthly',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Complete solution for large businesses',
        price: 5000, // ৳5,000/month
        currency: 'BDT',
        billingCycle: 'monthly',
        trialPeriod: 168, // 7 days
        features: {
          pos: true,
          inventory: true,
          crm: true,
          accounting: true,
          aiInsights: true,
          multiBranch: true,
          maxUsers: -1, // Unlimited
          maxBranches: -1, // Unlimited
        },
        stripePriceId: 'price_enterprise_monthly',
        isActive: true,
        sortOrder: 3,
      },
    ];

    await this.subscriptionPlanModel.insertMany(defaultPlans);
  }
}
