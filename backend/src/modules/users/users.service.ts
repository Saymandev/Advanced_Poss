import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserFilterDto } from '../../common/dto/pagination.dto';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { PasswordValidator } from '../../common/utils/password-validator.util';
import { PasswordUtil } from '../../common/utils/password.util';
import { BranchesService } from '../branches/branches.service';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { CompaniesService } from '../companies/companies.service';
import { LoginSecurityService } from '../settings/login-security.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private cloudinaryService: CloudinaryService,
    private configService: ConfigService,
    private loginSecurityService: LoginSecurityService,
  ) {}

  async create(createUserDto: CreateUserDto, skipPasswordValidation: boolean = false): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check subscription limits for max users
    if (createUserDto.companyId) {
      const company = await this.companiesService.findOne(createUserDto.companyId);
      if (company.subscriptionPlan) {
        const plan = await this.subscriptionPlansService.findByName(company.subscriptionPlan);
        if (plan && plan.features.maxUsers !== -1) {
          const existingUsers = await this.userModel.countDocuments({ companyId: createUserDto.companyId });
          if (existingUsers >= plan.features.maxUsers) {
            throw new BadRequestException(
              `You have reached the maximum user limit (${plan.features.maxUsers}) for your ${plan.displayName} plan. Please upgrade to add more users.`
            );
          }
        }
      }
    }

    // Validate password against system security settings (skip for temporary passwords during registration)
    if (createUserDto.password && !skipPasswordValidation) {
      const securitySettings = await this.loginSecurityService.getPasswordSecuritySettings();
      PasswordValidator.validateOrThrow(createUserDto.password, securitySettings);
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(createUserDto.password);

    // Hash PIN if provided
    let hashedPin: string | undefined;
    if (createUserDto.pin) {
      hashedPin = await PasswordUtil.hash(createUserDto.pin);
    }

    // Generate employee ID if staff role
    let employeeId: string | undefined;
    if (
      createUserDto.branchId &&
      ['waiter', 'chef', 'manager'].includes(createUserDto.role)
    ) {
      // Generate based on branch code (you'd fetch this from branch)
      employeeId = GeneratorUtil.generateEmployeeId('BRANCH');
    }

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      pin: hashedPin,
      employeeId,
      joinedDate: new Date(),
    });

    return user.save();
  }

  async findAll(filterDto: UserFilterDto): Promise<{ users: User[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const query: any = { ...filters };

    // Transform status to isActive if provided
    if (query.status !== undefined) {
      query.isActive = query.status === 'active';
      delete query.status;
    }

    // CRITICAL: Filter out super_admin users unless explicitly requested
    if (!query.includeSuperAdmins) {
      query.role = { $ne: 'super_admin' };
    } else {
      delete query.includeSuperAdmins;
    }

    // CRITICAL: Filter by branchId - only show employees assigned to this specific branch
    // This ensures that when working at Branch X, you only see employees assigned to Branch X
    // Employees without a branchId assignment will be excluded
    if (query.branchId) {
      try {
        // Try both string and ObjectId formats for branchId filtering
        const branchIdStr = query.branchId.toString();
        const branchIdObj = new Types.ObjectId(query.branchId);
        // Use $in to match either string or ObjectId format
        // This ensures only employees assigned to this branch are returned
        query.branchId = { $in: [branchIdStr, branchIdObj] };
      } catch (error) {
        // If branchId is not a valid ObjectId, use string format
        const branchIdStr = query.branchId.toString();
        query.branchId = branchIdStr;
      }
    }

    // Add search functionality
    // MongoDB will automatically AND the branchId condition (if exists) with search $or conditions
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await this.userModel
      .find(query)
      .select('-password -pin')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.userModel.countDocuments(query);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .select('-password -pin')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure id field is present (transform _id to id)
    const userData = user as any;
    return {
      ...userData,
      id: userData._id?.toString() || userData.id || userData._id,
      companyId: userData.companyId?._id?.toString() || userData.companyId?.toString() || userData.companyId,
      branchId: userData.branchId?._id?.toString() || userData.branchId?.toString() || userData.branchId,
      company: userData.companyId,
      branch: userData.branchId,
    } as User;
  }

  async findOneWithSecret(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Explicitly select twoFactorSecret and twoFactorBackupCodes even though they have select: false
    const user = await this.userModel
      .findById(id)
      .select('+twoFactorSecret +twoFactorBackupCodes')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .exec();

    return user;
  }

  async findOneWithPassword(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Include password and pin fields for authentication purposes
    const user = await this.userModel
      .findById(id)
      .select('+password +pin')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .exec();

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password +pin +refreshToken')
      .exec();
  }

  async findByEmailVerificationToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ emailVerificationToken: token })
      .select('+emailVerificationToken')
      .exec();
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      })
      .select('+resetPasswordToken +resetPasswordExpires')
      .exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Get existing user to check companyId (without population to get raw ID)
    const existingUser = await this.userModel.findById(id).select('companyId');
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Validate branch assignment if branchId is being updated
    if (updateUserDto.branchId !== undefined) {
      if (updateUserDto.branchId === null || updateUserDto.branchId === '') {
        // Allow unassigning branch (set to null)
        updateUserDto.branchId = null as any;
      } else {
        // Validate branch exists and belongs to same company
        if (!Types.ObjectId.isValid(updateUserDto.branchId)) {
          throw new BadRequestException('Invalid branch ID');
        }

        const branch = await this.branchesService.findOne(updateUserDto.branchId);
        if (!branch) {
          throw new NotFoundException('Branch not found');
        }

        // Extract companyId from user (handle both ObjectId and populated object)
        let userCompanyId: string | undefined;
        if (existingUser.companyId) {
          userCompanyId = (existingUser.companyId as any)?._id?.toString() || 
                         existingUser.companyId.toString();
        }
        
        // Extract companyId from branch (it's populated, so it's an object with _id)
        let branchCompanyId: string | undefined;
        if (branch.companyId) {
          branchCompanyId = (branch.companyId as any)?._id?.toString() || 
                          branch.companyId.toString();
        }
        
        // Validate company match
        if (!userCompanyId) {
          throw new BadRequestException('User must belong to a company to be assigned to a branch');
        }
        
        if (!branchCompanyId) {
          throw new BadRequestException('Branch must belong to a company');
        }
        
        if (userCompanyId !== branchCompanyId) {
          throw new BadRequestException('Branch does not belong to the same company as the user');
        }
      }
    }

    // Get user before update to check role and old branchId
    const userBeforeUpdate = await this.userModel.findById(id).select('role branchId');
    const oldBranchId = userBeforeUpdate?.branchId?.toString();
    const currentRole = userBeforeUpdate?.role;
    const newRole = updateUserDto.role || currentRole;

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await PasswordUtil.hash(updateUserDto.password);
    }

    // If PIN is being updated, hash it
    if (updateUserDto.pin) {
      updateUserDto.pin = await PasswordUtil.hash(updateUserDto.pin);
    }

    // Build update object, ensuring 2FA fields are included if present
    const updateData: any = { ...updateUserDto };
    
    // Explicitly handle 2FA fields to ensure they're saved
    if ('twoFactorSecret' in updateUserDto) {
      updateData.twoFactorSecret = updateUserDto.twoFactorSecret;
    }
    if ('twoFactorBackupCodes' in updateUserDto) {
      updateData.twoFactorBackupCodes = updateUserDto.twoFactorBackupCodes;
    }
    if ('twoFactorEnabled' in updateUserDto) {
      updateData.twoFactorEnabled = updateUserDto.twoFactorEnabled;
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -pin')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle manager assignment to branch
    const newBranchId = updateUserDto.branchId?.toString() || (user.branchId?.toString() || null);
    const isManager = newRole === 'manager';
    const wasManager = currentRole === 'manager';
    const branchChanged = newBranchId !== oldBranchId;
    const roleChangedToManager = !wasManager && isManager;
    
    // Case 1: Manager assigned to a branch (branch changed OR role changed to manager)
    if (isManager && newBranchId && (branchChanged || roleChangedToManager)) {
      // Clear managerId from old branch if branch changed
      if (oldBranchId && branchChanged) {
        await this.branchModel.updateOne(
          { _id: new Types.ObjectId(oldBranchId) },
          { $unset: { managerId: '' } }
        );
      }
      
      // Set managerId on new branch (or current branch if role just changed to manager)
      // First, clear any existing manager from this branch
      await this.branchModel.updateOne(
        { _id: new Types.ObjectId(newBranchId) },
        { $unset: { managerId: '' } }
      );
      
      // Then set this user as the manager
      await this.branchModel.updateOne(
        { _id: new Types.ObjectId(newBranchId) },
        { managerId: new Types.ObjectId(id) }
      );
    }
    // Case 2: Manager unassigned from branch OR role changed from manager
    else if ((isManager && !newBranchId && oldBranchId) || (wasManager && !isManager && oldBranchId)) {
      // Clear managerId from old branch
      await this.branchModel.updateOne(
        { _id: new Types.ObjectId(oldBranchId) },
        { $unset: { managerId: '' } }
      );
    }
    // Case 3: User is already a manager, already assigned to branch, but managerId might not be set
    // This handles cases where managerId was not set due to previous bugs
    else if (isManager && newBranchId && !branchChanged && !roleChangedToManager) {
      // Ensure managerId is set on the branch
      const branch = await this.branchModel.findById(newBranchId).select('managerId');
      if (branch && branch.managerId?.toString() !== id) {
        // Only update if current managerId is different or null
        await this.branchModel.updateOne(
          { _id: new Types.ObjectId(newBranchId) },
          { managerId: new Types.ObjectId(id) }
        );
      }
    }

    return user;
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await PasswordUtil.hash(newPassword);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  async updatePin(userId: string, newPin: string): Promise<void> {
    const hashedPin = await PasswordUtil.hash(newPin);
    await this.userModel.findByIdAndUpdate(userId, {
      pin: hashedPin,
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Get current user to check for existing avatar
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if Cloudinary is configured
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(user.avatar);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        // Log error but don't fail the upload if deletion fails
        console.warn('Failed to delete old avatar from Cloudinary:', error);
      }
    }

    // Upload new avatar to Cloudinary
    if (!file.buffer) {
      throw new Error('File buffer is missing. Multer must be configured with memory storage.');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(
      file.buffer,
      'user-avatars',
      `user-${userId}-avatar`,
    );

    if (!uploadResult || !uploadResult.secure_url) {
      throw new Error('Cloudinary upload failed: No secure URL returned');
    }

    // Update user with Cloudinary URL
    await this.userModel.findByIdAndUpdate(
      userId,
      { avatar: uploadResult.secure_url },
      { new: true },
    ).exec();

    return { avatarUrl: uploadResult.secure_url };
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
  }

  async updateLastLogin(userId: string, ip: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      lastLoginIP: ip,
      loginAttempts: 0,
    });
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const attempts = (user.loginAttempts || 0) + 1;
    const updates: any = { loginAttempts: attempts };

    // Use system settings for lockout
    const { shouldLock, lockUntil } = await this.loginSecurityService.shouldLockAccount(attempts);
    if (shouldLock && lockUntil) {
      updates.lockUntil = lockUntil;
    }

    await this.userModel.findByIdAndUpdate(userId, updates);
  }

  async deactivate(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  async activate(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // Query methods
  async findByCompany(companyId: string): Promise<User[]> {
    return this.userModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .select('-password -pin')
      .exec();
  }

  async findByBranch(branchId: string): Promise<User[]> {
    // Handle both string and ObjectId formats
    const branchObjectId = Types.ObjectId.isValid(branchId) 
      ? new Types.ObjectId(branchId) 
      : branchId;
    
    return this.userModel
      .find({ 
        branchId: { $in: [branchObjectId, branchId] }, // Try both formats
        isActive: { $ne: false } // Include if isActive is true or undefined
      })
      .select('-password -pin')
      .exec();
  }

  async findByBranchAndRole(branchId: string, role: string): Promise<User[]> {
    return this.userModel
      .find({ 
        branchId: new Types.ObjectId(branchId), 
        role: role.toLowerCase(),
        isActive: true 
      })
      .select('-password -pin')
      .populate('branchId', 'name')
      .exec();
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userModel.find({ role, isActive: true }).select('-password -pin').exec();
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.userModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .exec();
  }

  async getCompanyById(companyId: string): Promise<any> {
    try {
      return await this.companiesService.findOne(companyId);
    } catch (error) {
      return null;
    }
  }

  async getCompanyBranches(companyId: string): Promise<any[]> {
    try {
      return await this.branchesService.findByCompany(companyId);
    } catch (error) {
      return [];
    }
  }
}

