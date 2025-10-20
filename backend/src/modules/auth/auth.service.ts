import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../common/enums/user-role.enum';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { PasswordUtil } from '../../common/utils/password.util';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginActivityService } from '../login-activity/login-activity.service';
import { LoginMethod, LoginStatus } from '../login-activity/schemas/login-activity.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { UsersService } from '../users/users.service';
import { CompanyOwnerRegisterDto } from './dto/company-owner-register.dto';
import { LoginDto } from './dto/login.dto';
import { PinLoginWithRoleDto } from './dto/pin-login-with-role.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private loginActivityService: LoginActivityService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingTime} minutes`,
      );
    }

    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await this.usersService.incrementLoginAttempts(user.id);
      return null;
    }

    // Reset login attempts on successful login
    await this.usersService.updateLastLogin(user.id, '0.0.0.0');

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
      },
      tokens,
    };
  }

  async superAdminLogin(superAdminLoginDto: SuperAdminLoginDto) {
    const { email, password } = superAdminLoginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is super admin
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Access denied. Super admin privileges required.');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingTime} minutes`,
      );
    }

    // Validate password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await this.usersService.incrementLoginAttempts(user.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset login attempts on successful login
    await this.usersService.updateLastLogin(user.id, '0.0.0.0');

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
        isSuperAdmin: true,
      },
      tokens,
    };
  }

  async loginWithPin(pinLoginDto: PinLoginDto) {
    const { pin, branchId } = pinLoginDto;

    // Find users in this branch
    const users = await this.usersService.findByBranch(branchId);

    for (const user of users) {
      const userWithPin = await this.usersService.findByEmail(user.email);
      
      if (userWithPin?.pin) {
        const isPinValid = await PasswordUtil.compare(pin, userWithPin.pin);
        
        if (isPinValid) {
          const tokens = await this.generateTokens(user);
          // @ts-ignore - Mongoose virtual property
          await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

          return {
            user: {
              // @ts-ignore - Mongoose virtual property
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              companyId: user.companyId,
              branchId: user.branchId,
            },
            tokens,
          };
        }
      }
    }

    throw new UnauthorizedException('Invalid PIN');
  }

  async pinLoginWithRole(pinLoginDto: PinLoginWithRoleDto) {
    const { pin, branchId, companyId, role } = pinLoginDto;

    // Find users in this branch with the specified role
    const users = await this.usersService.findByBranch(branchId);
    
    // Filter users by role (case-insensitive)
    const usersWithRole = users.filter(user => user.role.toLowerCase() === role.toLowerCase());

    if (usersWithRole.length === 0) {
      throw new UnauthorizedException(`No users found with role '${role}' in this branch`);
    }

    for (const user of usersWithRole) {
      const userWithPin = await this.usersService.findByEmail(user.email);
      
      if (userWithPin?.pin) {
        const isPinValid = await PasswordUtil.compare(pin, userWithPin.pin);
        
        if (isPinValid) {
          // Check if account is locked
          if (userWithPin.lockUntil && userWithPin.lockUntil > new Date()) {
            const remainingTime = Math.ceil(
              (userWithPin.lockUntil.getTime() - Date.now()) / 60000,
            );
            throw new UnauthorizedException(
              `Account is locked. Try again in ${remainingTime} minutes`,
            );
          }

          // Check if user is active
          if (!userWithPin.isActive) {
            throw new UnauthorizedException('Account is deactivated');
          }

          // Reset login attempts on successful login
          await this.usersService.updateLastLogin(userWithPin.id, '0.0.0.0');

          const tokens = await this.generateTokens(userWithPin);
          // @ts-ignore - Mongoose virtual property
          await this.usersService.updateRefreshToken(userWithPin.id, tokens.refreshToken);

          return {
            user: {
              // @ts-ignore - Mongoose virtual property
              id: userWithPin.id,
              email: userWithPin.email,
              firstName: userWithPin.firstName,
              lastName: userWithPin.lastName,
              role: userWithPin.role,
              companyId: userWithPin.companyId,
              branchId: userWithPin.branchId,
            },
            tokens,
          };
        }
      }
    }

    throw new UnauthorizedException('Invalid PIN for this role');
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      role: registerDto.role || 'waiter',
    } as any);

    // Generate email verification token
    const verificationToken = GeneratorUtil.generateToken();
    // @ts-ignore - Mongoose virtual property
    await this.usersService.update(user.id, {
      emailVerificationToken: verificationToken,
    } as any);

    // TODO: Send verification email
    // await this.mailService.sendVerificationEmail(user.email, verificationToken);

    const tokens = await this.generateTokens(user);
    // @ts-ignore - Mongoose virtual property
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        // @ts-ignore - Mongoose virtual property
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
      verificationToken, // For development only
    };
  }

  async registerCompanyOwner(registerDto: CompanyOwnerRegisterDto) {
    const {
      companyName,
      companyType,
      country,
      companyEmail,
      branchName,
      branchAddress,
      package: subscriptionPackage,
      firstName,
      lastName,
      phoneNumber,
      pin,
    } = registerDto;

    // Check if company email already exists
    const existingCompany = await this.companiesService.findByEmail(companyEmail);
    if (existingCompany) {
      throw new BadRequestException('Company with this email already exists');
    }

    // Create company first (without ownerId initially)
    const company = await this.companiesService.create({
      name: companyName,
      email: companyEmail,
      phone: phoneNumber,
      subscriptionPlan: subscriptionPackage,
      address: {
        street: branchAddress,
        city: 'Unknown', // Will be updated later
        state: 'Unknown',
        country,
        zipCode: '00000',
      },
    } as any);

    // Create the first branch
    const branch = await this.branchesService.create({
      companyId: (company as any)._id.toString(),
      name: branchName,
      address: {
        street: branchAddress,
        city: 'Unknown',
        state: 'Unknown',
        country,
        zipCode: '00000',
      },
    });

    // Hash the PIN
    const hashedPin = await PasswordUtil.hash(pin);
    
    // Generate a temporary password (user will change it later)
    const tempPassword = GeneratorUtil.generateToken();

    // Create the owner user
    const user = await this.usersService.create({
      firstName,
      lastName,
      email: companyEmail,
      phone: phoneNumber,
      password: tempPassword,
      pin: hashedPin,
      role: UserRole.OWNER,
      companyId: (company as any)._id.toString(),
      branchId: (branch as any)._id.toString(),
    });

    // Update company with owner ID
    await this.companiesService.update((company as any)._id.toString(), { 
      ownerId: (user as any)._id.toString() 
    } as any);

    // Get subscription plan details
    const subscriptionPlan = await this.subscriptionPlansService.findByName(subscriptionPackage);
    const requiresPayment = subscriptionPlan.price > 0;

    // Generate tokens
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken((user as any)._id.toString(), tokens.refreshToken);

    return {
      user: {
        id: (user as any)._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
      },
      company: {
        id: (company as any)._id.toString(),
        name: company.name,
        email: company.email,
      },
      branch: {
        id: (branch as any)._id.toString(),
        name: branch.name,
        address: branch.address,
      },
      tokens,
      requiresPayment,
      subscriptionPlan: {
        name: subscriptionPlan.name,
        displayName: subscriptionPlan.displayName,
        price: subscriptionPlan.price,
        currency: subscriptionPlan.currency,
        stripePriceId: subscriptionPlan.stripePriceId,
        trialPeriod: subscriptionPlan.trialPeriod,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user);
      // @ts-ignore - Mongoose virtual property
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersService.verifyEmail(user.id);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = GeneratorUtil.generateToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    } as any);

    // TODO: Send reset email
    // await this.mailService.sendPasswordReset(user.email, resetToken);

    return {
      message: 'If the email exists, a reset link has been sent',
      resetToken, // For development only
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(user.id, newPassword);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findOne(userId)).email,
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await PasswordUtil.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.updatePassword(userId, newPassword);

    return { message: 'Password changed successfully' };
  }

  async findCompany(email?: string, companyId?: string) {
    // Validate that at least one parameter is provided
    if (!email && !companyId) {
      return {
        found: false,
        message: 'Please provide either email or company ID',
      };
    }

    let user = null;
    let targetCompanyId = companyId;

    // If email is provided, find user by email
    if (email) {
      user = await this.usersService.findByEmail(email);
      if (!user) {
        return {
          found: false,
          message: 'No restaurant found with this email',
        };
      }
      targetCompanyId = user.companyId;
    }

    // Validate that we have a valid company ID
    if (!targetCompanyId) {
      return {
        found: false,
        message: 'No company associated with this user',
      };
    }

    // Get company details
    const company = await this.usersService.getCompanyById(targetCompanyId.toString());
    if (!company) {
      return {
        found: false,
        message: 'Company not found',
      };
    }

    // Get all branches for this company
    const branches = await this.usersService.getCompanyBranches(targetCompanyId.toString());

    // Get available roles for each branch
    const branchesWithRoles = await Promise.all(
      branches.map(async (branch: any) => {
        const branchUsers = await this.usersService.findByBranch(branch._id.toString());
        const availableRoles = [...new Set(branchUsers.map(user => user.role))];

        // Group users by role for selection
        const usersByRole = {};
        branchUsers.forEach(user => {
          if (!usersByRole[user.role]) {
            usersByRole[user.role] = [];
          }
          usersByRole[user.role].push({
            id: (user as any)._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          });
        });

        return {
          id: branch._id.toString(),
          name: branch.name,
          address: branch.address,
          isActive: branch.isActive,
          availableRoles: availableRoles,
          usersByRole: usersByRole
        };
      })
    );

    return {
      found: true,
      companyId: targetCompanyId,
      companyName: company.name,
      companySlug: company.slug || company.name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: company.logoUrl,
      branches: branchesWithRoles,
      message: 'Please select a branch, role, and enter your PIN to continue',
    };
  }

  async loginWithRole(loginData: {
    companyId: string;
    branchId: string;
    role: string;
    userId?: string;
    pin: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { companyId, branchId, role, userId, pin, ipAddress, userAgent } = loginData;

    // Find user by role and branch
    let user: any;
    if (userId) {
      // If userId is provided, find specific user
      user = await this.usersService.findOne(userId);
      if (!user || user.role !== role || user.branchId !== branchId) {
        // Log failed login attempt
        await this.logLoginActivity({
          userId: userId || 'unknown',
          companyId,
          branchId,
          email: 'unknown',
          role: role as any,
          status: LoginStatus.FAILED,
          method: LoginMethod.PIN_ROLE,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          failureReason: 'Invalid user selection',
        });
        throw new UnauthorizedException('Invalid user selection');
      }
    } else {
      // Find user by role and branch
      const users = await this.usersService.findByBranch(branchId);
      const roleUsers = users.filter(u => u.role.toLowerCase() === role.toLowerCase());
      
      if (roleUsers.length === 0) {
        // Log failed login attempt
        await this.logLoginActivity({
          userId: 'unknown',
          companyId,
          branchId,
          email: 'unknown',
          role: role as any,
          status: LoginStatus.FAILED,
          method: LoginMethod.PIN_ROLE,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          failureReason: 'No users found with this role in this branch',
        });
        throw new UnauthorizedException('No users found with this role in this branch');
      }
      
      if (roleUsers.length > 1) {
        // Log failed login attempt
        await this.logLoginActivity({
          userId: 'unknown',
          companyId,
          branchId,
          email: 'unknown',
          role: role as any,
          status: LoginStatus.FAILED,
          method: LoginMethod.PIN_ROLE,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          failureReason: 'Multiple users found with this role',
        });
        throw new BadRequestException('Multiple users found with this role. Please select a specific user.');
      }
      
      user = roleUsers[0];
    }

    // Verify PIN
    const userWithPin = await this.usersService.findByEmail(user.email);
    if (!userWithPin?.pin) {
      // Log failed login attempt
      await this.logLoginActivity({
        userId: user._id.toString(),
        companyId: user.companyId,
        branchId: user.branchId,
        email: user.email,
        role: user.role,
        status: LoginStatus.FAILED,
        method: LoginMethod.PIN_ROLE,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        failureReason: 'PIN not set',
      });
      throw new UnauthorizedException('PIN not set for this user');
    }

    const isPinValid = await PasswordUtil.compare(pin, userWithPin.pin);
    if (!isPinValid) {
      // Log failed login attempt
      await this.logLoginActivity({
        userId: user._id.toString(),
        companyId: user.companyId,
        branchId: user.branchId,
        email: user.email,
        role: user.role,
        status: LoginStatus.FAILED,
        method: LoginMethod.PIN_ROLE,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        failureReason: 'Invalid PIN',
      });
      throw new UnauthorizedException('Invalid PIN for this role');
    }

    // Generate tokens
    const payload = { 
      sub: user._id.toString(), 
      email: user.email, 
      role: user.role,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString()
    };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Generate session ID
    const sessionId = GeneratorUtil.generateId();

    // Log successful login activity
    await this.logLoginActivity({
      userId: user._id.toString(),
      companyId: user.companyId,
      branchId: user.branchId,
      email: user.email,
      role: user.role,
      status: LoginStatus.SUCCESS,
      method: LoginMethod.PIN_ROLE,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      sessionId,
    });

    // Create login session
    await this.loginActivityService.createLoginSession({
      userId: user._id.toString(),
      companyId: user.companyId,
      branchId: user.branchId,
      sessionId,
      accessToken,
      refreshToken,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      loginTime: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Update last login
    await this.usersService.update(user._id.toString(), { lastLogin: new Date() } as any);

    return {
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          branchId: user.branchId
        },
        accessToken,
        refreshToken,
        sessionId
      }
    };
  }

  private async logLoginActivity(activityData: {
    userId: string;
    companyId?: string;
    branchId?: string;
    email: string;
    role: any;
    status: LoginStatus;
    method: LoginMethod;
    ipAddress: string;
    userAgent: string;
    location?: string;
    deviceInfo?: string;
    failureReason?: string;
    sessionId?: string;
  }) {
    try {
      await this.loginActivityService.createLoginActivity({
        ...activityData,
        loginTime: new Date(),
      });
    } catch (error) {
      // Log error but don't fail the login process
      console.error('Failed to log login activity:', error);
    }
  }
}

