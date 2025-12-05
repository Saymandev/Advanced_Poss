import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import {
  convertLegacyFeaturesToKeys,
  ensureCoreFeatures,
  normalizeFeatureKeys
} from './utils/plan-features.helper';

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

    // Validate and normalize enabledFeatureKeys if provided
    let enabledFeatureKeys: string[] = [];
    if (createDto.enabledFeatureKeys && createDto.enabledFeatureKeys.length > 0) {
      const normalized = normalizeFeatureKeys(createDto.enabledFeatureKeys);
      if (normalized.invalidKeys.length > 0) {
        throw new BadRequestException(
          `Invalid feature keys: ${normalized.invalidKeys.join(', ')}`,
        );
      }
      enabledFeatureKeys = normalized.normalized;
    } else if (createDto.features) {
      // If no enabledFeatureKeys but has legacy features, convert them
      enabledFeatureKeys = convertLegacyFeaturesToKeys(createDto.features);
    } else {
      // No features provided, add at least core features
      enabledFeatureKeys = ensureCoreFeatures([]);
    }

    const plan = new this.subscriptionPlanModel({
      ...createDto,
      currency: 'BDT', // Currency is handled globally in Settings, default to system default (BDT)
      enabledFeatureKeys,
    });

    return plan.save();
  }

  async findAll(filterActive?: boolean): Promise<SubscriptionPlan[]> {
    const query: any = {};
    // Only filter by isActive if explicitly provided
    if (filterActive !== undefined) {
      query.isActive = filterActive;
    }
    return this.subscriptionPlanModel
      .find(query)
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
    const existingPlan = await this.subscriptionPlanModel.findById(id);
    if (!existingPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Prepare update data
    const updateData: any = { ...updateDto };

    // Handle enabledFeatureKeys if provided
    if (updateDto.enabledFeatureKeys !== undefined) {
      if (updateDto.enabledFeatureKeys.length > 0) {
        const normalized = normalizeFeatureKeys(updateDto.enabledFeatureKeys);
        if (normalized.invalidKeys.length > 0) {
          throw new BadRequestException(
            `Invalid feature keys: ${normalized.invalidKeys.join(', ')}`,
          );
        }
        updateData.enabledFeatureKeys = normalized.normalized;
      } else {
        // Empty array means no custom features, use core features only
        updateData.enabledFeatureKeys = ensureCoreFeatures([]);
      }
    } else if (updateDto.features) {
      // If updating legacy features, convert to enabledFeatureKeys
      const convertedKeys = convertLegacyFeaturesToKeys(updateDto.features);
      updateData.enabledFeatureKeys = convertedKeys;
    }

    const plan = await this.subscriptionPlanModel.findByIdAndUpdate(
      id,
      updateData,
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

  /**
   * Migrate legacy plan features to new enabledFeatureKeys format
   */
  async migrateToEnabledFeatureKeys(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findById(id);
    
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // If already has enabledFeatureKeys, return as is
    if (plan.enabledFeatureKeys && plan.enabledFeatureKeys.length > 0) {
      return plan.toObject();
    }

    // Convert legacy features to enabledFeatureKeys
    let enabledFeatureKeys: string[] = [];
    if (plan.features) {
      enabledFeatureKeys = convertLegacyFeaturesToKeys(plan.features);
    } else {
      // If no features at all, add core features
      enabledFeatureKeys = ensureCoreFeatures([]);
    }

    // Update the plan with new enabledFeatureKeys
    const updatedPlan = await this.subscriptionPlanModel.findByIdAndUpdate(
      id,
      { enabledFeatureKeys },
      { new: true },
    );

    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return updatedPlan.toObject();
  }

  /**
   * Get plan with normalized feature keys (useful for API responses)
   */
  async getPlanWithNormalizedFeatures(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);

    // Ensure plan has enabledFeatureKeys (migrate if needed)
    if (!plan.enabledFeatureKeys || plan.enabledFeatureKeys.length === 0) {
      if (plan.features) {
        plan.enabledFeatureKeys = convertLegacyFeaturesToKeys(plan.features);
      } else {
        plan.enabledFeatureKeys = ensureCoreFeatures([]);
      }
    }

    // Normalize (ensure core features, remove duplicates)
    plan.enabledFeatureKeys = ensureCoreFeatures(plan.enabledFeatureKeys);

    return plan;
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
