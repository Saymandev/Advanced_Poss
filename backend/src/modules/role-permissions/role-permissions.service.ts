import {
  BadRequestException,
  Injectable
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DEFAULT_ROLE_FEATURES } from '../../common/constants/features.constants';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { CORE_FEATURES, convertLegacyFeaturesToKeys } from '../subscriptions/utils/plan-features.helper';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import {
  RolePermission,
  RolePermissionDocument,
} from './schemas/role-permission.schema';
@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectModel(RolePermission.name)
    private rolePermissionModel: Model<RolePermissionDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private subscriptionPlansService: SubscriptionPlansService,
  ) { }
  async getRolePermissions(companyId: string): Promise<RolePermission[]> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }
    const permissions = await this.rolePermissionModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .lean()
      .exec();
    // If no permissions exist, initialize with defaults
    if (permissions.length === 0) {
      return await this.initializeDefaultPermissions(companyId);
    }
    return permissions.map((perm: any) => ({
      ...perm,
      id: perm._id.toString(),
    }));
  }
  async getRolePermission(
    companyId: string,
    role: string,
  ): Promise<RolePermission | null> {
    if (!Types.ObjectId.isValid(companyId)) {
      console.error(`[RolePermissions] Invalid company ID: ${companyId}`);
      throw new BadRequestException('Invalid company ID');
    }
    const permission = await this.rolePermissionModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        role,
      })
      .lean()
      .exec();
    let roleFeatures: string[] = [];
    if (!permission) {
      // If permission doesn't exist, initialize default permissions for the company
      // This ensures users always have permissions
      const allPermissions = await this.initializeDefaultPermissions(companyId);
      const defaultPermission = allPermissions.find((p) => p.role === role);
      if (!defaultPermission) {
        return null;
      }
      roleFeatures = defaultPermission.features || [];
    } else {
      roleFeatures = permission.features || [];
    }

    // CRITICAL: Merge default features into roleFeatures if they are missing
    // This ensures newly added system features are available to existing roles without manual migration
    const defaultFeatures = DEFAULT_ROLE_FEATURES[role] || [];
    const missingDefaults = defaultFeatures.filter(f => !roleFeatures.includes(f));
    if (missingDefaults.length > 0) {
      roleFeatures = [...roleFeatures, ...missingDefaults];
    }

    // Filter features based on subscription - only return features enabled in subscription
    // CRITICAL: Query for active subscriptions that are NOT expired
    // This prevents expired subscriptions from being used even if isActive hasn't been fixed yet
    const subscription = await this.subscriptionModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
        status: {
          $nin: [SubscriptionStatus.EXPIRED, 'expired', SubscriptionStatus.CANCELLED, 'cancelled'] // Exclude expired/cancelled
        },
      })
      .lean()
      .exec();
    // If no subscription, return only core features
    if (!subscription) {
      return {
        ...(permission || {}),
        id: permission?._id?.toString() || '',
        companyId: new Types.ObjectId(companyId),
        role,
        features: [...CORE_FEATURES],
      } as RolePermission;
    }
    // CRITICAL: Check if subscription is expired or inactive
    const subscriptionStatus = subscription.status as string;
    const isExpired = subscriptionStatus === SubscriptionStatus.EXPIRED ||
      subscriptionStatus === 'expired' ||
      subscription.isActive === false;
    // If subscription is expired or inactive, return only core features
    if (isExpired) {
      return {
        ...(permission || {}),
        id: permission?._id?.toString() || '',
        companyId: new Types.ObjectId(companyId),
        role,
        features: [...CORE_FEATURES],
      } as RolePermission;
    }
    // Check subscription status for active/trial
    const isActiveOrTrial = subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.TRIAL ||
      subscriptionStatus === 'active' ||
      subscriptionStatus === 'trial';
    // Get enabled features from subscription
    let enabledFeatures: string[] = [];
    // Priority 1: Check if feature-based subscription (new flexible model)
    // BUT: If subscription.enabledFeatures has very few features (< 5), it's likely incomplete
    // In that case, fall back to plan lookup to get the full feature set
    if (subscription.enabledFeatures && Array.isArray(subscription.enabledFeatures) && subscription.enabledFeatures.length >= 5) {
      enabledFeatures = subscription.enabledFeatures;
    } else if (subscription.enabledFeatures && Array.isArray(subscription.enabledFeatures) && subscription.enabledFeatures.length > 0) {
      // If subscription has some features but less than 5, still use them but also try plan lookup for completeness
      enabledFeatures = subscription.enabledFeatures;
      // Continue to plan lookup below to potentially get more features
    }
    // Priority 2: Get features from plan (if subscription.enabledFeatures is empty, undefined, or has too few features)
    if (enabledFeatures.length < 5 && subscription.plan) {
      try {
        // Handle both string and object (in case plan is populated)
        const planName = typeof subscription.plan === 'string'
          ? subscription.plan
          : (subscription.plan as any)?.name || subscription.plan;
        const plan = await this.subscriptionPlansService.findByName(planName);
        if (plan) {
          // Check new enabledFeatureKeys first
          if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys) && plan.enabledFeatureKeys.length > 0) {
            enabledFeatures = plan.enabledFeatureKeys;
          }
          // Fallback to legacy features object
          else if (plan.features) {
            enabledFeatures = convertLegacyFeaturesToKeys(plan.features);
          } else {
            console.warn(`[RolePermissions] ⚠️ Plan '${planName}' has no enabledFeatureKeys or features object`);
            console.warn(`[RolePermissions] Plan object keys:`, Object.keys(plan || {}));
          }
        } else {
          console.error(`[RolePermissions] ❌ Plan '${planName}' NOT FOUND for company ${companyId}`);
        }
      } catch (error) {
        console.error(`[RolePermissions] ❌ Error fetching plan '${subscription.plan}':`, error);
        if (error instanceof Error) {
          console.error(`[RolePermissions] Error message:`, error.message);
          console.error(`[RolePermissions] Error stack:`, error.stack);
        }
        // Continue to fallback logic
      }
    } else if (!subscription.plan) {
      console.warn(`[RolePermissions] ⚠️ Subscription has no plan property for company ${companyId}`);
    }
    // If subscription is active/trial but no features extracted (or very few), return all role features
    // This handles cases where subscription.enabledFeatures is incomplete or plan lookup failed
    if (enabledFeatures.length < 5 && isActiveOrTrial) {
      return {
        ...(permission || {}),
        id: permission?._id?.toString() || '',
        companyId: new Types.ObjectId(companyId),
        role,
        features: roleFeatures, // Return all role features as fallback
      } as RolePermission;
    }
    // Always ensure core features are included
    enabledFeatures = [...new Set([...CORE_FEATURES, ...enabledFeatures])];
    // Debug logging
    // Filter role features to only include features enabled in subscription
    const filteredFeatures = roleFeatures.filter(feature => enabledFeatures.includes(feature));
    // Safety check: If filtering resulted in no features but subscription is active, return all role features
    if (filteredFeatures.length === 0 && isActiveOrTrial) {
      console.warn(`[RolePermissions] Filtering resulted in 0 features for active subscription, returning all ${roleFeatures.length} role features as safety fallback`);
      return {
        ...(permission || {}),
        id: permission?._id?.toString() || '',
        companyId: new Types.ObjectId(companyId),
        role,
        features: roleFeatures,
      } as RolePermission;
    }
    return {
      ...(permission || {}),
      id: permission?._id?.toString() || '',
      companyId: new Types.ObjectId(companyId),
      role,
      features: filteredFeatures,
    } as RolePermission;
  }
  async updateRolePermission(
    companyId: string,
    updateDto: UpdateRolePermissionDto,
    updatedBy?: string,
  ): Promise<RolePermission> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }
    const updateData: any = {
      companyId: new Types.ObjectId(companyId),
      role: updateDto.role,
      features: updateDto.features,
    };
    if (updatedBy && Types.ObjectId.isValid(updatedBy)) {
      updateData.updatedBy = new Types.ObjectId(updatedBy);
    }
    const permission = await this.rolePermissionModel
      .findOneAndUpdate(
        {
          companyId: new Types.ObjectId(companyId),
          role: updateDto.role,
        },
        updateData,
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return {
      ...permission,
      id: permission._id.toString(),
    } as RolePermission;
  }
  async initializeDefaultPermissions(
    companyId: string,
  ): Promise<RolePermission[]> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }
    // Default feature sets for each role (using constants for consistency)
    const defaultPermissions = DEFAULT_ROLE_FEATURES;
    const createdPermissions: RolePermission[] = [];
    for (const [role, features] of Object.entries(defaultPermissions)) {
      const permission = await this.rolePermissionModel
        .findOneAndUpdate(
          {
            companyId: new Types.ObjectId(companyId),
            role,
          },
          {
            companyId: new Types.ObjectId(companyId),
            role,
            features,
          },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
      createdPermissions.push({
        ...permission,
        id: permission._id.toString(),
      } as RolePermission);
    }
    return createdPermissions;
  }
}
