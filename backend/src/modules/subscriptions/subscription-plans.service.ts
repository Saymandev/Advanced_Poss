import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import {
  convertLegacyFeaturesToKeys,
  ensureCoreFeatures,
  getFeatureDisplayName,
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

  async findAll(filterActive?: boolean): Promise<any[]> {
    const query: any = {};
    // Only filter by isActive if explicitly provided
    if (filterActive !== undefined) {
      query.isActive = filterActive;
    }
    const plans = await this.subscriptionPlanModel
      .find(query)
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    
    // Add feature names to each plan
    return plans.map((plan: any) => {
      // .lean() returns plain objects, so no need for toObject()
      const planObj = { ...plan };
      // Map enabledFeatureKeys to feature names
      if (planObj.enabledFeatureKeys && Array.isArray(planObj.enabledFeatureKeys)) {
        planObj.featureNames = planObj.enabledFeatureKeys.map((key: string) => 
          getFeatureDisplayName(key)
        );
      }
      return planObj;
    });
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
    console.log('🔴 [BACKEND] Update called with:');
    console.log('  - id:', id);
    console.log('  - updateDto:', JSON.stringify(updateDto, null, 2));
    console.log('  - updateDto keys:', Object.keys(updateDto));
    
    const existingPlan = await this.subscriptionPlanModel.findById(id);
    if (!existingPlan) {
      throw new NotFoundException('Subscription plan not found');
    }
    
    console.log('🔴 [BACKEND] Existing plan:');
    console.log('  - name:', existingPlan.name);
    console.log('  - displayName:', existingPlan.displayName);
    console.log('  - description:', existingPlan.description);
    console.log('  - stripePriceId:', existingPlan.stripePriceId);

    // Prepare update data - ONLY include fields that are actually provided
    // This prevents accidentally removing fields that weren't in the update request
    const updateData: any = {};

    // Only update fields that are explicitly provided in the DTO
    // CRITICAL: Check for undefined AND null to prevent accidental overwrites
    // Frontend now only sends fields with actual values, so we can safely update what's provided
    console.log('🔴 [BACKEND] Processing displayName:');
    console.log('  - updateDto.displayName:', updateDto.displayName);
    console.log('  - is undefined?', updateDto.displayName === undefined);
    console.log('  - is null?', updateDto.displayName === null);
    console.log('  - is empty?', updateDto.displayName === '');
    if (updateDto.displayName !== undefined && updateDto.displayName !== null && updateDto.displayName !== '') {
      updateData.displayName = updateDto.displayName;
      console.log('  - ✅ Added to updateData');
    } else {
      console.log('  - ❌ NOT added to updateData');
    }
    
    console.log('🔴 [BACKEND] Processing description:');
    console.log('  - updateDto.description:', updateDto.description);
    console.log('  - is undefined?', updateDto.description === undefined);
    console.log('  - is null?', updateDto.description === null);
    console.log('  - is empty?', updateDto.description === '');
    if (updateDto.description !== undefined && updateDto.description !== null && updateDto.description !== '') {
      updateData.description = updateDto.description;
      console.log('  - ✅ Added to updateData');
    } else {
      console.log('  - ❌ NOT added to updateData');
    }
    // Price: Only update if explicitly provided (frontend now only sends if field has value)
    if (updateDto.price !== undefined && updateDto.price !== null) {
      updateData.price = updateDto.price;
    }
    // Note: currency is not in UpdateSubscriptionPlanDto, so we skip it
    // Currency is typically set from system settings and shouldn't be changed per plan
    if (updateDto.billingCycle !== undefined && updateDto.billingCycle !== null && updateDto.billingCycle !== '') {
      updateData.billingCycle = updateDto.billingCycle;
    }
    // Trial Period: Only update if explicitly provided (frontend now only sends if field has value)
    if (updateDto.trialPeriod !== undefined && updateDto.trialPeriod !== null) {
      updateData.trialPeriod = updateDto.trialPeriod;
    }
    if (updateDto.stripePriceId !== undefined && updateDto.stripePriceId !== null && updateDto.stripePriceId !== '') {
      updateData.stripePriceId = updateDto.stripePriceId;
    }
    // isActive: Only update if explicitly provided (checkbox state is always sent when present)
    if (updateDto.isActive !== undefined && updateDto.isActive !== null) {
      updateData.isActive = updateDto.isActive;
    }
    if (updateDto.isPopular !== undefined && updateDto.isPopular !== null) {
      updateData.isPopular = updateDto.isPopular;
    }
    if (updateDto.sortOrder !== undefined && updateDto.sortOrder !== null) {
      updateData.sortOrder = updateDto.sortOrder;
    }
    if (updateDto.limits !== undefined && updateDto.limits !== null) {
      updateData.limits = updateDto.limits;
    }
    if (updateDto.featureList !== undefined && updateDto.featureList !== null) {
      updateData.featureList = updateDto.featureList;
    }

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
    } else if (updateDto.features !== undefined) {
      // If updating legacy features, convert to enabledFeatureKeys
      const convertedKeys = convertLegacyFeaturesToKeys(updateDto.features);
      updateData.enabledFeatureKeys = convertedKeys;
      // Also preserve the legacy features object for backward compatibility
      updateData.features = updateDto.features;
    }
    // If neither enabledFeatureKeys nor features are provided, preserve existing ones
    // Don't touch them if they're not in the update

    console.log('🔴 [BACKEND] Final updateData:');
    console.log(JSON.stringify(updateData, null, 2));
    console.log('🔴 [BACKEND] updateData keys:', Object.keys(updateData));
    
    // Only update if there's actually something to update
    if (Object.keys(updateData).length === 0) {
      console.log('🔴 [BACKEND] No fields to update, returning existing plan');
      return existingPlan;
    }

    console.log('🔴 [BACKEND] Calling findByIdAndUpdate with:');
    console.log('  - id:', id);
    console.log('  - $set:', JSON.stringify(updateData, null, 2));

    const plan = await this.subscriptionPlanModel.findByIdAndUpdate(
      id,
      { $set: updateData }, // Use $set operator to only update specified fields
      { new: true },
    );
    
    console.log('🔴 [BACKEND] Update result:');
    console.log('  - plan.name:', plan?.name);
    console.log('  - plan.displayName:', plan?.displayName);
    console.log('  - plan.description:', plan?.description);

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
