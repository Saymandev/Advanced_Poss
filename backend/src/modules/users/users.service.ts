import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserFilterDto } from '../../common/dto/pagination.dto';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { PasswordUtil } from '../../common/utils/password.util';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
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

    // Add search functionality
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

    const user = await this.userModel.findById(id).select('-password -pin');

    if (!user) {
      throw new NotFoundException('User not found');
    }

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

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await PasswordUtil.hash(updateUserDto.password);
    }

    // If PIN is being updated, hash it
    if (updateUserDto.pin) {
      updateUserDto.pin = await PasswordUtil.hash(updateUserDto.pin);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -pin');

    if (!user) {
      throw new NotFoundException('User not found');
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

    // Lock account after 5 failed attempts for 15 minutes
    if (attempts >= 5) {
      updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
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
    return this.userModel
      .find({ branchId: branchId })
      .select('-password -pin')
      .exec();
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userModel.find({ role }).select('-password -pin').exec();
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

