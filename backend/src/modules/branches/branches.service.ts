import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BranchFilterDto } from '../../common/dto/pagination.dto';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { CompaniesService } from '../companies/companies.service';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { DeliveryZone, DeliveryZoneDocument } from '../delivery-zones/schemas/delivery-zone.schema';
import { DigitalReceipt, DigitalReceiptDocument } from '../digital-receipts/schemas/digital-receipt.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Ingredient, IngredientDocument } from '../ingredients/schemas/ingredient.schema';
import { KitchenOrder, KitchenOrderDocument } from '../kitchen/schemas/kitchen-order.schema';
import { LoginActivity, LoginActivityDocument } from '../login-activity/schemas/login-activity.schema';
import { LoginSession, LoginSessionDocument } from '../login-activity/schemas/login-session.schema';
import { MarketingCampaign, MarketingCampaignDocument } from '../marketing/schemas/marketing-campaign.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { PaymentMethod, PaymentMethodDocument } from '../payment-methods/schemas/payment-method.schema';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { POSPayment, POSPaymentDocument } from '../pos/schemas/pos-payment.schema';
import { POSSettings, POSSettingsDocument } from '../pos/schemas/pos-settings.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../purchase-orders/schemas/purchase-order.schema';
import { QRCode, QRCodeDocument } from '../qr-codes/schemas/qr-code.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { ScheduleShift, ScheduleShiftDocument } from '../schedule/schemas/schedule-shift.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Wastage, WastageDocument } from '../wastage/schemas/wastage.schema';
import { WorkPeriod, WorkPeriodDocument } from '../work-periods/schemas/work-period.schema';
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
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(DeliveryZone.name) private deliveryZoneModel: Model<DeliveryZoneDocument>,
    @InjectModel(DigitalReceipt.name) private digitalReceiptModel: Model<DigitalReceiptDocument>,
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
    @InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>,
    @InjectModel(KitchenOrder.name) private kitchenOrderModel: Model<KitchenOrderDocument>,
    @InjectModel(LoginActivity.name) private loginActivityModel: Model<LoginActivityDocument>,
    @InjectModel(LoginSession.name) private loginSessionModel: Model<LoginSessionDocument>,
    @InjectModel(MarketingCampaign.name) private marketingCampaignModel: Model<MarketingCampaignDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethodDocument>,
    @InjectModel(POSPayment.name) private posPaymentModel: Model<POSPaymentDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(QRCode.name) private qrCodeModel: Model<QRCodeDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(ScheduleShift.name) private scheduleShiftModel: Model<ScheduleShiftDocument>,
    @InjectModel(Wastage.name) private wastageModel: Model<WastageDocument>,
    @InjectModel(WorkPeriod.name) private workPeriodModel: Model<WorkPeriodDocument>,
    private companiesService: CompaniesService,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    // Verify company exists
    const company = await this.companiesService.findOne(createBranchDto.companyId);
    
    // Ensure company has slug - if not, generate it
    if (!company.slug) {
      const companySlug = GeneratorUtil.generateSlug(company.name);
      const existingSlugs = await this.companiesService.findAll({});
      const slugsList = existingSlugs.map((c: any) => c.slug).filter(Boolean);
      const uniqueSlug = GeneratorUtil.generateUniqueSlug(company.name, slugsList);
      
      // Update company with slug
      await this.companiesService.update(createBranchDto.companyId, { slug: uniqueSlug } as any);
      // Refresh company object to get updated slug
      const updatedCompany = await this.companiesService.findOne(createBranchDto.companyId);
      if (updatedCompany) {
        (company as any).slug = updatedCompany.slug || uniqueSlug;
      } else {
        (company as any).slug = uniqueSlug;
      }
    }

    // Check if this is the first branch for the company
    const existingBranchesCount = await this.branchModel.countDocuments({ companyId: createBranchDto.companyId });
    const isFirstBranch = existingBranchesCount === 0;

    // Check subscription limits for multi-branch feature (only for additional branches, not the first one)
    if (!isFirstBranch && company.subscriptionPlan) {
      const plan = await this.subscriptionPlansService.findByName(company.subscriptionPlan);
      if (plan) {
        // Check if multi-branch is enabled (skip for first branch)
        if (!plan.features.multiBranch) {
          throw new BadRequestException('Multi-branch feature is not available in your current plan. Please upgrade to create additional branches.');
        }

        // Check branch limit (already counted existing branches above)
        if (plan.features.maxBranches !== -1) {
          if (existingBranchesCount >= plan.features.maxBranches) {
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
    // Use the slug from the company object (which may have been updated above)
    const companySlug = (company as any).slug || company.slug;
    if (!publicUrl && companySlug && slug) {
      const baseUrl =
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        'http://localhost:3000';
      publicUrl = `${baseUrl}/${companySlug}/${slug}`;
    } else if (!publicUrl) {
      // Log warning if publicUrl couldn't be generated
      console.warn(`⚠️ Could not generate publicUrl for branch "${createBranchDto.name}". Company slug: ${companySlug || 'missing'}, Branch slug: ${slug || 'missing'}`);
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
    includeDeleted = false,
  ): Promise<{ branches: Branch[]; total: number; page: number; limit: number }> {
    const query: Record<string, any> = {};

    if (filter.companyId) {
      query.companyId = filter.companyId;
    }

    // Exclude soft deleted branches by default unless explicitly requested
    if (!includeDeleted) {
      query.deletedAt = { $exists: false };
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
        .populate('companyId', 'name email slug')
        .populate('managerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.branchModel.countDocuments(query),
    ]);

    // Auto-generate slugs for branches that don't have them
    const branchesToUpdate: Array<{ id: string; slug: string; publicUrl?: string }> = [];
    
    for (const branch of branches as any[]) {
      if (!branch.slug) {
        const companyId = branch.companyId?._id?.toString() || branch.companyId?.id || branch.companyId;
        if (companyId) {
          const existingBranches = await this.branchModel.find({ 
            companyId: new Types.ObjectId(companyId),
            slug: { $exists: true }
          }).select('slug').lean();
          const slugsList = existingBranches.map((b: any) => b.slug).filter(Boolean);
          const autoSlug = GeneratorUtil.generateUniqueSlug(branch.name, slugsList);
          
          const company = branch.companyId as any;
          let publicUrl = branch.publicUrl;
          const baseUrl =
            process.env.FRONTEND_URL ||
            process.env.APP_URL ||
            'http://localhost:3000';
          const needsRegenerate =
            !publicUrl ||
            publicUrl.startsWith('http://localhost:3000') ||
            publicUrl.includes('://localhost:3000/');
          if (company?.slug && needsRegenerate) {
            publicUrl = `${baseUrl.replace(/\/$/, '')}/${company.slug}/${autoSlug}`;
          }
          
          branchesToUpdate.push({
            id: branch._id.toString(),
            slug: autoSlug,
            publicUrl: publicUrl,
          });
          
          // Update the branch object in the response
          branch.slug = autoSlug;
          if (publicUrl) branch.publicUrl = publicUrl;
        }
      }
    }
    
    // Save all branches with auto-generated slugs in parallel
    if (branchesToUpdate.length > 0) {
      await Promise.all(
        branchesToUpdate.map(({ id, slug, publicUrl }) =>
          this.branchModel.findByIdAndUpdate(id, { slug, ...(publicUrl && { publicUrl }) }, { new: false })
        )
      );
    }

    // Ensure publicUrl in response uses current base domain (even if DB still has localhost)
    const baseUrlForResponse =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    for (const branch of branches as any[]) {
      const companySlug = (branch.companyId as any)?.slug;
      if (companySlug && branch.slug) {
        const needsRegenerate =
          !branch.publicUrl ||
          branch.publicUrl.startsWith('http://localhost:3000') ||
          branch.publicUrl.includes('://localhost:3000/');
        if (needsRegenerate) {
          branch.publicUrl = `${baseUrlForResponse.replace(/\/$/, '')}/${companySlug}/${branch.slug}`;
        }
      }
    }

    return {
      branches: branches as any,
      total,
      page,
      limit,
    };
  }

  async findDeleted(
    filter: BranchFilterDto,
  ): Promise<{ branches: Branch[]; total: number; page: number; limit: number }> {
    return this.findAll(filter, true);
  }

  async findOne(id: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel
      .findById(id)
      .populate('companyId', 'name email slug')
      .populate('managerId', 'firstName lastName email');

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Auto-generate slug if missing
    if (!branch.slug) {
      const companyId = (branch.companyId as any)?._id?.toString() || (branch.companyId as any)?.id;
      const existingBranches = await this.branchModel.find({ 
        companyId: new Types.ObjectId(companyId),
        slug: { $exists: true }
      }).select('slug').lean();
      const slugsList = existingBranches.map((b: any) => b.slug).filter(Boolean);
      const autoSlug = GeneratorUtil.generateUniqueSlug(branch.name, slugsList);
      
      // Update branch with auto-generated slug
      branch.slug = autoSlug;
      
      // Also update publicUrl if company has slug
      const company = branch.companyId as any;
      if (company?.slug) {
        const baseUrl =
          process.env.FRONTEND_URL ||
          process.env.APP_URL ||
          'http://localhost:3000';
        branch.publicUrl = `${baseUrl}/${company.slug}/${autoSlug}`;
      }
      
      // Save the branch with auto-generated slug
      await branch.save();
    }

    return branch;
  }

  async findBySlug(companyId: string, branchSlug: string): Promise<Branch> {
    // Validate companyId before using it
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }

    // First, try to find branch by company + slug (preferred, multi-tenant safe)
    let branch = await this.branchModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        slug: branchSlug,
      })
      .populate('companyId', 'name email slug')
      .populate('managerId', 'firstName lastName email')
      .lean();

    // Fallback: in case companyId casting or historical data causes mismatch,
    // try to find by slug only. This keeps old data working while still preferring
    // the stricter company+slug match above.
    if (!branch) {
      branch = await this.branchModel
        .findOne({ slug: branchSlug })
        .populate('companyId', 'name email slug')
        .populate('managerId', 'firstName lastName email')
        .lean();
    }

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch as any;
  }

  async findByCompany(companyId: string): Promise<Branch[]> {
    // Use findAll to properly exclude soft-deleted branches
    const result = await this.findAll({ companyId }, false); // false = exclude deleted
    return result.branches;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findById(id).populate('companyId');
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const companyId = (branch.companyId as any)?._id?.toString() || (branch.companyId as any)?.id;

    // Handle slug update with validation (per company uniqueness)
    if ((updateBranchDto as any).slug !== undefined) {
      let newSlug = (updateBranchDto as any).slug;
      
      // If slug is provided, validate and ensure uniqueness within company
      if (newSlug) {
        // Sanitize slug
        newSlug = GeneratorUtil.generateSlug(newSlug);
        
        if (!newSlug) {
          throw new BadRequestException('Invalid slug format. Slug cannot be empty after sanitization.');
        }

        // Check uniqueness within the same company (exclude current branch)
        const existingBranch = await this.branchModel.findOne({ 
          companyId: new Types.ObjectId(companyId),
          slug: newSlug,
          _id: { $ne: id }
        });
        
        if (existingBranch) {
          throw new BadRequestException(`Slug "${newSlug}" is already taken by another branch in this company.`);
        }
        
        (updateBranchDto as any).slug = newSlug;
        
        // Update publicUrl if slug changed
        const company = await this.companiesService.findOne(companyId);
        if (company?.slug) {
          const baseUrl =
            process.env.FRONTEND_URL ||
            process.env.APP_URL ||
            'http://localhost:3000';
          (updateBranchDto as any).publicUrl = `${baseUrl}/${company.slug}/${newSlug}`;
        }
      } else {
        // If slug is being removed or set to empty, generate one from branch name
        const branchName = (updateBranchDto as any).name || branch.name;
        const existingBranches = await this.branchModel.find({ 
          companyId: new Types.ObjectId(companyId),
          slug: { $exists: true }
        }).select('slug').lean();
        const slugsList = existingBranches.map((b: any) => b.slug).filter(Boolean);
        const autoSlug = GeneratorUtil.generateUniqueSlug(branchName, slugsList);
        (updateBranchDto as any).slug = autoSlug;
        
        // Update publicUrl
        const company = await this.companiesService.findOne(companyId);
        if (company?.slug) {
          const baseUrl =
            process.env.FRONTEND_URL ||
            process.env.APP_URL ||
            'http://localhost:3000';
          (updateBranchDto as any).publicUrl = `${baseUrl}/${company.slug}/${autoSlug}`;
        }
      }
    } else if (!branch.slug) {
      // Generate slug if branch doesn't have one
      const existingBranches = await this.branchModel.find({ 
        companyId: new Types.ObjectId(companyId),
        slug: { $exists: true }
      }).select('slug').lean();
      const slugsList = existingBranches.map((b: any) => b.slug).filter(Boolean);
      const autoSlug = GeneratorUtil.generateUniqueSlug(branch.name, slugsList);
      (updateBranchDto as any).slug = autoSlug;
      
      // Update publicUrl
      const company = await this.companiesService.findOne(companyId);
      if (company?.slug) {
        const baseUrl =
          process.env.FRONTEND_URL ||
          process.env.APP_URL ||
          'http://localhost:3000';
        (updateBranchDto as any).publicUrl = `${baseUrl}/${company.slug}/${autoSlug}`;
      }
    }

    const updatedBranch = await this.branchModel
      .findByIdAndUpdate(id, updateBranchDto, { new: true })
      .populate('companyId', 'name email')
      .populate('managerId', 'firstName lastName email');

    if (!updatedBranch) {
      throw new NotFoundException('Branch not found');
    }

    return updatedBranch;
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

  async softDelete(id: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async restore(id: string): Promise<Branch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel.findByIdAndUpdate(
      id,
      { $unset: { deletedAt: 1 } },
      { new: true }
    );

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    // First check if branch exists and is soft deleted
    const branch = await this.branchModel.findById(id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (!branch.deletedAt) {
      throw new BadRequestException('Branch must be soft deleted before permanent deletion');
    }

    // Cascade delete all related data
    await this.permanentDeleteWithCascade(id);
  }

  async permanentDeleteWithCascade(branchId: string): Promise<void> {
    if (!branchId || branchId === 'undefined' || !Types.ObjectId.isValid(branchId)) {
      throw new Error(`Invalid branchId: ${branchId}`);
    }

    // Delete QR codes FIRST (might be referenced by other operations)
    await this.qrCodeModel.deleteMany({ branchId: new Types.ObjectId(branchId) });

    // Delete all tables associated with this branch
    await this.tableModel.deleteMany({ branchId });

    // Delete all POS orders and related payments
    await this.posOrderModel.deleteMany({ branchId });
    await this.posPaymentModel.deleteMany({ branchId });

    // Delete menu items and categories
    await this.menuItemModel.deleteMany({ branchId });
    await this.categoryModel.deleteMany({ branchId });

    // Delete attendance records
    await this.attendanceModel.deleteMany({ branchId });

    // Delete bookings and rooms
    await this.bookingModel.deleteMany({ branchId });
    await this.roomModel.deleteMany({ branchId });

    // Delete customers (branch-specific customers)
    await this.customerModel.deleteMany({ branchId });

    // Delete expenses
    await this.expenseModel.deleteMany({ branchId });

    // Delete ingredients and wastage
    await this.ingredientModel.deleteMany({ branchId });
    await this.wastageModel.deleteMany({ branchId });

    // Delete kitchen orders
    await this.kitchenOrderModel.deleteMany({ branchId });

    // Delete notifications
    await this.notificationModel.deleteMany({ branchId });

    // Delete orders
    await this.orderModel.deleteMany({ branchId });

    // Delete payment methods
    await this.paymentMethodModel.deleteMany({ branchId });

    // Delete purchase orders
    await this.purchaseOrderModel.deleteMany({ branchId });

    // Delete reviews
    await this.reviewModel.deleteMany({ branchId });

    // Delete digital receipts
    await this.digitalReceiptModel.deleteMany({ branchId });


    // Delete schedule shifts
    await this.scheduleShiftModel.deleteMany({ branchId });

    // Delete work periods
    await this.workPeriodModel.deleteMany({ branchId });

    // Delete login activities and sessions
    await this.loginActivityModel.deleteMany({ branchId });
    await this.loginSessionModel.deleteMany({ branchId });

    // Delete marketing campaigns
    await this.marketingCampaignModel.deleteMany({ branchId });

    // Delete delivery zones
    await this.deliveryZoneModel.deleteMany({ branchId });

    // Delete POS settings
    await this.posSettingsModel.deleteMany({ branchId });

    // Finally delete the branch itself
    await this.branchModel.findByIdAndDelete(branchId);
  }

  async getStats(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    // Fetch branch with populated managerId
    const branch = await this.branchModel
      .findById(id)
      .populate('managerId', 'firstName lastName email')
      .lean();
    
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    
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

