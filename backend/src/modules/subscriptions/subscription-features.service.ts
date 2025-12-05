import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubscriptionFeatureDto, UpdateSubscriptionFeatureDto } from './dto/subscription-feature.dto';
import {
    SubscriptionFeature,
    SubscriptionFeatureDocument,
} from './schemas/subscription-feature.schema';

@Injectable()
export class SubscriptionFeaturesService {
  constructor(
    @InjectModel(SubscriptionFeature.name)
    private featureModel: Model<SubscriptionFeatureDocument>,
  ) {}

  async create(
    createDto: CreateSubscriptionFeatureDto,
  ): Promise<SubscriptionFeatureDocument> {
    // Check if feature key already exists
    const existing = await this.featureModel.findOne({ key: createDto.key });
    if (existing) {
      throw new BadRequestException(
        `Feature with key '${createDto.key}' already exists`,
      );
    }

    const feature = new this.featureModel({
      ...createDto,
      basePriceYearly:
        createDto.basePriceYearly || createDto.basePriceMonthly * 10, // Default: 10 months if yearly not specified
    });

    return await feature.save();
  }

  async findAll(
    filters?: {
      category?: string;
      isActive?: boolean;
      isRequired?: boolean;
    },
  ): Promise<SubscriptionFeatureDocument[]> {
    const query: any = {};

    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.isRequired !== undefined) {
      query.isRequired = filters.isRequired;
    }

    return await this.featureModel
      .find(query)
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<SubscriptionFeatureDocument> {
    const feature = await this.featureModel.findById(id).exec();
    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found`);
    }
    return feature;
  }

  async findByKey(key: string): Promise<SubscriptionFeatureDocument | null> {
    return await this.featureModel.findOne({ key }).exec();
  }

  async update(
    id: string,
    updateDto: UpdateSubscriptionFeatureDto,
  ): Promise<SubscriptionFeatureDocument> {
    const feature = await this.findOne(id);

    Object.assign(feature, updateDto);
    return await feature.save();
  }

  async remove(id: string): Promise<void> {
    const feature = await this.findOne(id);

    // Don't allow deletion of required features
    if (feature.isRequired) {
      throw new BadRequestException(
        'Cannot delete a required feature. Deactivate it instead.',
      );
    }

    await feature.deleteOne();
  }

  /**
   * Calculate price for a set of features
   */
  async calculatePrice(
    featureKeys: string[],
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    branchCount: number = 1,
    userCount: number = 1,
  ): Promise<{
    basePrice: number;
    branchPrice: number;
    userPrice: number;
    totalPrice: number;
    features: SubscriptionFeatureDocument[];
  }> {
    const features = await this.featureModel
      .find({
        key: { $in: featureKeys },
        isActive: true,
      })
      .exec();

    if (features.length !== featureKeys.length) {
      const foundKeys = features.map((f) => f.key);
      const missingKeys = featureKeys.filter((k) => !foundKeys.includes(k));
      throw new BadRequestException(
        `Features not found: ${missingKeys.join(', ')}`,
      );
    }

    let basePrice = 0;
    let branchPrice = 0;
    let userPrice = 0;

    for (const feature of features) {
      const price =
        billingCycle === 'yearly'
          ? feature.basePriceYearly || feature.basePriceMonthly * 10
          : feature.basePriceMonthly;

      basePrice += price;
      branchPrice +=
        (feature.perBranchPriceMonthly || 0) *
        Math.max(0, branchCount - 1) *
        (billingCycle === 'yearly' ? 10 : 1);
      userPrice +=
        (feature.perUserPriceMonthly || 0) *
        Math.max(0, userCount - 1) *
        (billingCycle === 'yearly' ? 10 : 1);
    }

    return {
      basePrice,
      branchPrice,
      userPrice,
      totalPrice: basePrice + branchPrice + userPrice,
      features,
    };
  }

  /**
   * Build limits from enabled features
   */
  async buildLimitsFromFeatures(
    featureKeys: string[],
  ): Promise<{
    maxBranches: number;
    maxUsers: number;
    maxMenuItems: number;
    maxOrders: number;
    maxTables: number;
    maxCustomers: number;
    aiInsightsEnabled: boolean;
    advancedReportsEnabled: boolean;
    multiLocationEnabled: boolean;
    apiAccessEnabled: boolean;
    whitelabelEnabled: boolean;
    customDomainEnabled: boolean;
    prioritySupportEnabled: boolean;
    storageGB: number;
  }> {
    const features = await this.featureModel
      .find({
        key: { $in: featureKeys },
        isActive: true,
      })
      .exec();

    // Initialize with default values
    let maxBranches = -1; // -1 means unlimited
    let maxUsers = -1;
    let maxMenuItems = -1;
    let maxOrders = -1;
    let maxTables = -1;
    let maxCustomers = -1;
    let storageGB = 0;
    let aiInsightsEnabled = false;
    let advancedReportsEnabled = false;
    let multiLocationEnabled = false;
    let apiAccessEnabled = false;
    let whitelabelEnabled = false;
    let customDomainEnabled = false;
    let prioritySupportEnabled = false;

    // Merge limits from all features (take maximum values)
    for (const feature of features) {
      const limits = feature.defaultLimits || {};

      if (limits.maxBranches !== undefined) {
        if (maxBranches === -1) {
          maxBranches = limits.maxBranches;
        } else if (limits.maxBranches > maxBranches) {
          maxBranches = limits.maxBranches;
        }
      }

      if (limits.maxUsers !== undefined) {
        if (maxUsers === -1) {
          maxUsers = limits.maxUsers;
        } else if (limits.maxUsers > maxUsers) {
          maxUsers = limits.maxUsers;
        }
      }

      if (limits.maxMenuItems !== undefined) {
        if (maxMenuItems === -1) {
          maxMenuItems = limits.maxMenuItems;
        } else if (limits.maxMenuItems > maxMenuItems) {
          maxMenuItems = limits.maxMenuItems;
        }
      }

      if (limits.maxOrders !== undefined) {
        if (maxOrders === -1) {
          maxOrders = limits.maxOrders;
        } else if (limits.maxOrders > maxOrders) {
          maxOrders = limits.maxOrders;
        }
      }

      if (limits.maxTables !== undefined) {
        if (maxTables === -1) {
          maxTables = limits.maxTables;
        } else if (limits.maxTables > maxTables) {
          maxTables = limits.maxTables;
        }
      }

      if (limits.maxCustomers !== undefined) {
        if (maxCustomers === -1) {
          maxCustomers = limits.maxCustomers;
        } else if (limits.maxCustomers > maxCustomers) {
          maxCustomers = limits.maxCustomers;
        }
      }

      if (limits.storageGB !== undefined) {
        storageGB = Math.max(storageGB, limits.storageGB || 0);
      }

      if (limits.allowAIInsights) aiInsightsEnabled = true;
      if (limits.allowAdvancedReports) advancedReportsEnabled = true;
      if (limits.allowMultiBranch) multiLocationEnabled = true;
      if (limits.allowAPI) apiAccessEnabled = true;
      if (limits.allowWhitelabel) whitelabelEnabled = true;
    }

    return {
      maxBranches,
      maxUsers,
      maxMenuItems,
      maxOrders,
      maxTables,
      maxCustomers,
      aiInsightsEnabled,
      advancedReportsEnabled,
      multiLocationEnabled,
      apiAccessEnabled,
      whitelabelEnabled,
      customDomainEnabled,
      prioritySupportEnabled,
      storageGB,
    };
  }

  /**
   * Seed default features
   */
  async seedFeatures(): Promise<SubscriptionFeatureDocument[]> {
    const defaultFeatures = [
      {
        key: 'pos',
        name: 'POS System',
        description: 'Core Point of Sale system with order management',
        category: 'Orders',
        basePriceMonthly: 500,
        basePriceYearly: 5000,
        perBranchPriceMonthly: 200,
        isRequired: true,
        defaultLimits: {
          maxBranches: 1,
          maxUsers: 5,
          maxMenuItems: 100,
          maxOrders: 1000,
        },
        sortOrder: 1,
      },
      {
        key: 'inventory',
        name: 'Inventory Management',
        description: 'Stock tracking and inventory management',
        category: 'Inventory',
        basePriceMonthly: 300,
        basePriceYearly: 3000,
        defaultLimits: {
          maxMenuItems: 500,
        },
        sortOrder: 2,
      },
      {
        key: 'crm',
        name: 'Customer Management',
        description: 'Customer relationship management and loyalty programs',
        category: 'Customers',
        basePriceMonthly: 200,
        basePriceYearly: 2000,
        defaultLimits: {
          maxCustomers: 1000,
        },
        sortOrder: 3,
      },
      {
        key: 'accounting',
        name: 'Accounting & Reports',
        description: 'Advanced financial reports and accounting features',
        category: 'Financial',
        basePriceMonthly: 250,
        basePriceYearly: 2500,
        defaultLimits: {
          allowAdvancedReports: true,
        },
        sortOrder: 4,
      },
      {
        key: 'ai-insights',
        name: 'AI Insights',
        description: 'AI-powered analytics and recommendations',
        category: 'AI Features',
        basePriceMonthly: 400,
        basePriceYearly: 4000,
        defaultLimits: {
          allowAIInsights: true,
        },
        sortOrder: 5,
      },
      {
        key: 'multi-branch',
        name: 'Multi-Branch Support',
        description: 'Manage multiple branches/locations',
        category: 'System',
        basePriceMonthly: 300,
        basePriceYearly: 3000,
        perBranchPriceMonthly: 150,
        defaultLimits: {
          allowMultiBranch: true,
          maxBranches: -1, // Unlimited
        },
        sortOrder: 6,
      },
    ];

    const createdFeatures: SubscriptionFeatureDocument[] = [];

    for (const featureData of defaultFeatures) {
      const existing = await this.featureModel.findOne({
        key: featureData.key,
      });

      if (!existing) {
        const feature = new this.featureModel(featureData);
        await feature.save();
        createdFeatures.push(feature);
      } else {
        // Update existing feature
        Object.assign(existing, featureData);
        await existing.save();
        createdFeatures.push(existing);
      }
    }

    return createdFeatures;
  }
}

