import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';
import { EmailService } from '../../common/services/email.service';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { PasswordUtil } from '../../common/utils/password.util';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginActivityService } from '../login-activity/login-activity.service';
import { LoginMethod, LoginStatus } from '../login-activity/schemas/login-activity.schema';
import { LoginSecurityService } from '../settings/login-security.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { SuperAdminNotificationsService } from '../super-admin-notifications/super-admin-notifications.service';
import { UsersService } from '../users/users.service';
import { CompanyOwnerRegisterDto } from './dto/company-owner-register.dto';
import { LoginDto } from './dto/login.dto';
import { PinLoginWithRoleDto } from './dto/pin-login-with-role.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { Verify2FALoginDto } from './dto/verify-2fa.dto';
import { TwoFactorService } from './two-factor.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private loginActivityService: LoginActivityService,
    private loginSecurityService: LoginSecurityService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private twoFactorService: TwoFactorService,
    private superAdminNotificationsService: SuperAdminNotificationsService,
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

    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`🔐 SUPER ADMIN LOGIN - Starting authentication`);
    this.logger.log(`📧 Email: ${email}`);
    this.logger.log(`🔑 Password: ***REDACTED***`);

    // Find user by email
    this.logger.log(`🔍 Searching for user with email: ${email}`);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.error(`❌ User not found with email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`✅ User found: ${user.email} (${user.firstName} ${user.lastName})`);
    this.logger.log(`🎭 User role: ${user.role}`);

    // Check if user is super admin
    if (user.role !== UserRole.SUPER_ADMIN) {
      this.logger.error(`❌ Access denied - User is not super admin. Role: ${user.role}`);
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

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const temporaryToken = await this.generateTemporaryToken(user);

      this.logger.log(`✅ SUPER ADMIN LOGIN - 2FA Required`);
      this.logger.log(`👤 User: ${user.email} (${user.firstName} ${user.lastName})`);
      this.logger.log(`🔐 Temporary token issued for 2FA verification`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return {
        requires2FA: true,
        temporaryToken,
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
        message: '2FA verification required. Please verify your 2FA code.',
      };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`✅ SUPER ADMIN LOGIN - Success`);
    this.logger.log(`👤 User: ${user.email} (${user.firstName} ${user.lastName})`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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
      
      if (!userWithPin) continue;

      // Check if account is locked BEFORE attempting PIN validation
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
        continue; // Skip inactive users, try next user
      }
      
      if (userWithPin.pin) {
        const isPinValid = await PasswordUtil.compare(pin, userWithPin.pin);
        
        if (isPinValid) {
          // Reset login attempts on successful login
          await this.usersService.updateLastLogin((user as any)._id?.toString() || (user as any).id, '0.0.0.0');

          const tokens = await this.generateTokens(user);
          // @ts-ignore - Mongoose virtual property
          await this.usersService.updateRefreshToken((user as any)._id?.toString() || (user as any).id, tokens.refreshToken);

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
        } else {
          // Invalid PIN - increment login attempts for this user
          await this.usersService.incrementLoginAttempts((user as any)._id?.toString() || (user as any).id);
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
      
      if (!userWithPin?.pin) {
        continue;
      }

      // Check if account is locked BEFORE attempting PIN validation
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

      const isPinValid = await PasswordUtil.compare(pin, userWithPin.pin);
      
      if (isPinValid) {
        // Reset login attempts on successful login
        await this.usersService.updateLastLogin((userWithPin as any)._id?.toString() || (userWithPin as any).id, '0.0.0.0');

        const tokens = await this.generateTokens(userWithPin);
        // @ts-ignore - Mongoose virtual property
        await this.usersService.updateRefreshToken((userWithPin as any)._id?.toString() || (userWithPin as any).id, tokens.refreshToken);

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
      } else {
        // Invalid PIN - increment login attempts
        await this.usersService.incrementLoginAttempts((userWithPin as any)._id?.toString() || (userWithPin as any).id);
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

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );
    } catch (error) {
      this.logger.warn(`Failed to send verification email to ${user.email}:`, error);
    }

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

    // Handle branchAddress - frontend sends as object: { street, city, state, country, zipCode }
    let streetAddress = '';
    let cityAddress = '';
    let stateAddress = '';
    let zipCodeAddress = '';
    
    if (typeof branchAddress === 'object' && branchAddress !== null) {
      // Frontend is sending object format: { street, city, state, country, zipCode }
      streetAddress = (branchAddress as any).street?.trim() || '';
      cityAddress = (branchAddress as any).city?.trim() || '';
      stateAddress = (branchAddress as any).state?.trim() || '';
      zipCodeAddress = (branchAddress as any).zipCode?.trim() || '';
      
      // Only use defaults if values are truly missing (not just empty strings from form)
      if (!cityAddress) cityAddress = 'Unknown';
      if (!stateAddress) stateAddress = 'Unknown';
      if (!zipCodeAddress) zipCodeAddress = '00000';
    } else if (typeof branchAddress === 'string') {
      // Legacy format: just a string
      streetAddress = branchAddress.trim();
      cityAddress = 'Unknown';
      stateAddress = 'Unknown';
      zipCodeAddress = '00000';
    }

    // Create company first (without ownerId initially)
    const company = await this.companiesService.create({
      name: companyName,
      email: companyEmail,
      phone: phoneNumber,
      subscriptionPlan: subscriptionPackage,
      address: {
        street: streetAddress,
        city: cityAddress,
        state: stateAddress,
        country,
        zipCode: zipCodeAddress,
      },
    } as any);

    // Create the first branch
    const branch = await this.branchesService.create({
      companyId: (company as any)._id.toString(),
      name: branchName,
      address: {
        street: streetAddress,
        city: cityAddress,
        state: stateAddress,
        country,
        zipCode: zipCodeAddress,
      },
    });

    // Generate a temporary password that meets security requirements (user will change it later)
    // Using PasswordUtil.generate() ensures it meets all password complexity requirements
    const tempPassword = PasswordUtil.generate(16);

    // Create the owner user
    // Skip password validation for temporary password during registration (user logs in with PIN)
    // Note: PIN will be hashed by users.service.ts - pass plain PIN here
    const user = await this.usersService.create({
      firstName,
      lastName,
      email: companyEmail,
      phone: phoneNumber,
      password: tempPassword,
      pin: pin, // Pass plain PIN - users.service will hash it
      role: UserRole.OWNER,
      companyId: (company as any)._id.toString(),
      branchId: (branch as any)._id.toString(),
    }, true); // skipPasswordValidation = true for registration

    // Update company with owner ID
    await this.companiesService.update((company as any)._id.toString(), { 
      ownerId: (user as any)._id.toString() 
    });

    // Get subscription plan details
    const subscriptionPlan = await this.subscriptionPlansService.findByName(subscriptionPackage);
    const requiresPayment = subscriptionPlan.price > 0;

    // Generate tokens
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken((user as any)._id.toString(), tokens.refreshToken);

    // Notify super admins about the new company registration
    try {
      await this.superAdminNotificationsService.create({
        type: 'company.registered',
        title: 'New company registered',
        message: `${company.name} just registered with plan ${subscriptionPlan.displayName || subscriptionPlan.name}`,
        companyId: (company as any)._id.toString(),
        metadata: {
          companyName,
          plan: subscriptionPlan.name,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create super-admin notification for new company: ${error?.message || error}`);
    }

    // Format branch address for response
    let formattedBranchAddress = '';
    if (branch.address) {
      if (typeof branch.address === 'string') {
        formattedBranchAddress = branch.address;
      } else if (typeof branch.address === 'object' && branch.address !== null) {
        const addr = branch.address as any;
        // Ensure we're accessing the address fields correctly
        // Address schema: { street: string, city: string, state?: string, country: string, zipCode?: string }
        const street = String(addr.street || '').trim();
        const city = String(addr.city || '').trim();
        const state = String(addr.state || '').trim();
        const zipCode = String(addr.zipCode || '').trim();
        
        const parts = [
          street,
          city && city !== 'Unknown' ? city : null,
          state && state !== 'Unknown' ? state : null,
          zipCode && zipCode !== '00000' ? zipCode : null
        ].filter(Boolean);
        formattedBranchAddress = parts.length > 0 ? parts.join(', ') : (street || 'Address not available');
      }
    }

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
        slug: (company as any).slug, // Include slug for public URL routing
      },
      branch: {
        id: (branch as any)._id.toString(),
        name: branch.name,
        address: formattedBranchAddress,
        slug: (branch as any).slug, // Include slug for public URL routing
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`🔄 REFRESH TOKEN - Starting refresh`);
    this.logger.log(`🔑 Refresh Token (first 50 chars): ${refreshToken ? refreshToken.substring(0, 50) + '...' : 'MISSING'}`);

    if (!refreshToken) {
      this.logger.error(`❌ Refresh token is missing`);
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const refreshSecret = this.configService.get('jwt.refreshSecret');
      const accessSecret = this.configService.get('jwt.secret');
      
      this.logger.log(`🔐 Refresh Secret: ${refreshSecret ? 'SET (' + refreshSecret.substring(0, 10) + '...)' : 'NOT SET'}`);
      this.logger.log(`🔐 Access Secret: ${accessSecret ? 'SET (' + accessSecret.substring(0, 10) + '...)' : 'NOT SET'}`);
      this.logger.log(`🔍 Secrets match: ${refreshSecret === accessSecret ? 'YES (PROBLEM!)' : 'NO (GOOD)'}`);

      // Try to decode the token first (without verification) to see what's in it
      try {
        const decoded = this.jwtService.decode(refreshToken);
        this.logger.log(`📋 Decoded token (without verification): ${JSON.stringify(decoded, null, 2)}`);
      } catch (decodeError) {
        this.logger.warn(`⚠️  Could not decode token: ${decodeError.message}`);
      }

      // Try verifying with refresh secret first
      let payload;
      try {
        this.logger.log(`🔍 Attempting verification with refresh secret...`);
        payload = this.jwtService.verify(refreshToken, {
          secret: refreshSecret,
        });
        this.logger.log(`✅ Token verified successfully with refresh secret`);
      } catch (refreshError) {
        this.logger.error(`❌ Verification with refresh secret failed: ${refreshError.message}`);
        
        // Try with access secret as fallback (to see if old tokens were generated with wrong secret)
        try {
          this.logger.log(`🔍 Attempting verification with access secret (fallback)...`);
          payload = this.jwtService.verify(refreshToken, {
            secret: accessSecret,
          });
          this.logger.warn(`⚠️  Token verified with ACCESS secret (wrong secret used during generation!)`);
          this.logger.warn(`⚠️  This means the token was generated with the wrong secret.`);
        } catch (accessError) {
          this.logger.error(`❌ Verification with access secret also failed: ${accessError.message}`);
          throw refreshError; // Throw original error
        }
      }

      this.logger.log(`👤 User ID from token: ${payload.sub}`);
      this.logger.log(`📧 Email from token: ${payload.email}`);
      this.logger.log(`🎭 Role from token: ${payload.role}`);

      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        this.logger.error(`❌ User not found with ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.log(`✅ User found: ${user.email} (${user.firstName} ${user.lastName})`);

      const tokens = await this.generateTokens(user);
      // @ts-ignore - Mongoose virtual property
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`✅ REFRESH TOKEN - Success`);
      this.logger.log(`🔑 New tokens generated`);
      this.logger.log(`🔑 Access token: ${tokens.accessToken.substring(0, 30)}...`);
      this.logger.log(`🔑 Refresh token: ${tokens.refreshToken.substring(0, 30)}...`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Return both tokens for frontend to update
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      this.logger.error(`❌ REFRESH TOKEN - Failed`);
      this.logger.error(`📛 Error Type: ${error.constructor.name}`);
      this.logger.error(`📛 Error Message: ${error.message || 'Unknown error'}`);
      this.logger.error(`📋 Error Stack: ${error.stack || 'No stack trace'}`);
      
      // Log specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        this.logger.error(`🚫 JWT Error: Invalid token format or signature`);
      } else if (error.name === 'TokenExpiredError') {
        this.logger.error(`⏰ JWT Error: Token has expired`);
      } else if (error.name === 'NotBeforeError') {
        this.logger.error(`⏰ JWT Error: Token not active yet`);
      }
      
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
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

  private async generateTemporaryToken(user: any) {
    const payload = {
      sub: user.id || user._id?.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString(),
      twoFactorRequired: true,
    };

    const accessSecret = this.configService.get('jwt.secret');
    const expiresIn = '5m'; // 5 minutes for 2FA verification

    return this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn,
    });
  }

  private async generateTokens(user: any) {
    // Handle both Mongoose documents (_id) and plain objects (id)
    const userId = user.id || (user as any)._id?.toString() || user._id;
    
    this.logger.log(`🔑 Token Generation - User ID resolution:`);
    this.logger.log(`   - user.id: ${user.id || 'NOT SET'}`);
    this.logger.log(`   - user._id: ${(user as any)._id || 'NOT SET'}`);
    this.logger.log(`   - user._id?.toString(): ${(user as any)._id?.toString() || 'NOT SET'}`);
    this.logger.log(`   - Final userId: ${userId}`);
    this.logger.log(`   - userId type: ${typeof userId}`);
    this.logger.log(`   - userId is valid ObjectId: ${Types.ObjectId.isValid(userId)}`);
    
    const payload = {
      sub: userId,
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString(),
    };
    
    this.logger.log(`🔑 Token payload.sub (user ID in token): ${payload.sub}`);

    const accessSecret = this.configService.get('jwt.secret');
    const refreshSecret = this.configService.get('jwt.refreshSecret');
    const accessExpiresIn = this.configService.get('jwt.expiresIn');
    const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn');

    this.logger.log(`🔑 Generating tokens for user: ${user.email}`);
    this.logger.log(`🔐 Access secret: ${accessSecret ? 'SET' : 'NOT SET'}`);
    this.logger.log(`🔐 Refresh secret: ${refreshSecret ? 'SET' : 'NOT SET'}`);
    this.logger.log(`🔍 Secrets are different: ${accessSecret !== refreshSecret ? 'YES (GOOD)' : 'NO (PROBLEM!)'}`);
    this.logger.log(`⏱️  Access expires in: ${accessExpiresIn}`);
    this.logger.log(`⏱️  Refresh expires in: ${refreshExpiresIn}`);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    this.logger.debug(`✅ Tokens generated successfully`);

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

  async changePin(
    userId: string,
    currentPin: string,
    newPin: string,
  ) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findOne(userId)).email,
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.pin) {
      throw new UnauthorizedException('PIN not set for this user');
    }

    const isPinValid = await PasswordUtil.compare(currentPin, user.pin);

    if (!isPinValid) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    await this.usersService.updatePin(userId, newPin);

    return { message: 'PIN changed successfully' };
  }

  async findCompany(email?: string, companyId?: string) {
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`🔍 FIND COMPANY - Starting search`);
    this.logger.log(`📧 Email (raw): ${email || 'N/A'}`);
    this.logger.log(`🏢 Company ID: ${companyId || 'N/A'}`);

    // Validate that at least one parameter is provided
    if (!email && !companyId) {
      this.logger.warn(`❌ FIND COMPANY - No email or company ID provided`);
      return {
        found: false,
        message: 'Please provide either email or company ID',
      };
    }

    // Normalize email to lowercase for consistent searching
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    this.logger.log(`📧 Email (normalized): ${normalizedEmail || 'N/A'}`);

    let user = null;
    let targetCompanyId = companyId;

    // If email is provided, first try to find company by email, then user by email
    if (normalizedEmail) {
      this.logger.log(`🔍 Searching for company by email: ${normalizedEmail}`);
      
      // Debug: Check what companies exist in DB
      try {
        const allCompanies = await this.companiesService.findAll({});
        this.logger.log(`📊 Total companies in database: ${allCompanies.length}`);
        if (allCompanies.length > 0) {
          const companyEmails = allCompanies.map((c: any) => c.email).filter(Boolean);
          this.logger.log(`📋 All company emails in DB: ${companyEmails.join(', ')}`);
          this.logger.log(`🔍 Looking for: "${normalizedEmail}"`);
          this.logger.log(`🔍 Exact match exists: ${companyEmails.includes(normalizedEmail) ? 'YES' : 'NO'}`);
          this.logger.log(`🔍 Case-insensitive match exists: ${companyEmails.some((e: string) => e.toLowerCase() === normalizedEmail) ? 'YES' : 'NO'}`);
        } else {
          this.logger.error(`❌ NO COMPANIES FOUND IN DATABASE!`);
          this.logger.error(`💡 You need to create a company first. Run the demo setup script or register a new company.`);
        }
      } catch (err) {
        this.logger.warn(`⚠️  Could not list companies: ${err.message}`);
      }
      
      // First try to find company by email (already normalized in findByEmail)
      const company = await this.companiesService.findByEmail(normalizedEmail);
      
      if (company) {
        targetCompanyId = (company as any)._id.toString();
        this.logger.log(`✅ Found company by email: ${(company as any)._id.toString()} - ${company.name}`);
        this.logger.log(`📧 Company email in DB: ${company.email}`);
        this.logger.log(`🔍 Email match: ${company.email === normalizedEmail ? 'YES' : 'NO'}`);
      } else {
        this.logger.error(`❌ Company not found by email: ${normalizedEmail}`);
        this.logger.log(`🔍 Searching for user by email as fallback: ${normalizedEmail}`);
        
        // If no company found, try to find user by email (normalize for consistency)
        user = await this.usersService.findByEmail(normalizedEmail);
        
        if (!user) {
          this.logger.error(`❌ No user found with email: ${normalizedEmail}`);
          this.logger.error(`💡 Possible reasons:`);
          this.logger.error(`   1. Company doesn't exist with this email`);
          this.logger.error(`   2. User doesn't exist with this email`);
          this.logger.error(`   3. Email format might be incorrect`);
          this.logger.error(`💡 Make sure you're using the COMPANY email, not a user email`);
          this.logger.error(`💡 Example company email: demo@restaurant.com`);
          this.logger.error(`💡 Example user email: owner@demo.com`);
          
          // Try to find any company to help debug
          try {
            const allCompanies = await this.companiesService.findAll({});
            this.logger.log(`📊 Total companies in database: ${allCompanies.length}`);
            if (allCompanies.length > 0) {
              this.logger.log(`📋 Available company emails: ${allCompanies.slice(0, 5).map((c: any) => c.email).join(', ')}`);
            }
          } catch (err) {
            this.logger.warn(`⚠️  Could not list companies: ${err.message}`);
          }
          
          return {
            found: false,
            message: 'No restaurant found with this email',
          };
        }
        
        targetCompanyId = user.companyId;
        this.logger.log(`✅ Found user by email: ${(user as any)._id.toString()} - Company ID: ${user.companyId}`);
        this.logger.log(`📧 User email in DB: ${user.email}`);
      }
    }

    // Validate that we have a valid company ID
    if (!targetCompanyId) {
      return {
        found: false,
        message: 'No company associated with this user',
      };
    }

    // Get company details
    let company;
    if (normalizedEmail && !user) {
      // We found company by email, use it directly
      company = await this.companiesService.findByEmail(normalizedEmail);
    } else {
      // We found user by email or have companyId, get company by ID
      company = await this.usersService.getCompanyById(targetCompanyId.toString());
    }
    
    if (!company) {
      return {
        found: false,
        message: 'Company not found',
      };
    }

    // Get all branches for this company
    this.logger.log(`🏢 Fetching branches for company: ${targetCompanyId}`);
    const branches = await this.usersService.getCompanyBranches(targetCompanyId.toString());
    this.logger.log(`✅ Found ${branches.length} branch(es)`);

    // Get available roles for each branch
    const branchesWithRoles = await Promise.all(
      branches.map(async (branch: any) => {
        const branchIdStr = branch._id.toString();
        const branchUsers = await this.usersService.findByBranch(branchIdStr);
        this.logger.log(`📍 Branch: ${branch.name} (ID: ${branchIdStr}) - Found ${branchUsers.length} user(s)`);
        branchUsers.forEach(user => {
          this.logger.log(`  👤 User: ${user.firstName} ${user.lastName} - Role: ${user.role} - Active: ${(user as any).isActive} - BranchId: ${(user as any).branchId}`);
        });
        const availableRoles = [...new Set(branchUsers.map(user => user.role))];
        this.logger.log(`📍 Branch: ${branch.name} - Users: ${branchUsers.length}, Roles: ${availableRoles.join(', ')}`);

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

        // Format address properly
        let formattedAddress = '';
        if (branch.address) {
          if (typeof branch.address === 'string') {
            formattedAddress = branch.address;
          } else if (typeof branch.address === 'object' && branch.address !== null) {
            const addr = branch.address as any;
            // Ensure we're accessing the address fields correctly
            // Address schema: { street: string, city: string, state?: string, country: string, zipCode?: string }
            const street = String(addr.street || '').trim();
            const city = String(addr.city || '').trim();
            const state = String(addr.state || '').trim();
            const zipCode = String(addr.zipCode || '').trim();
            
            const parts = [
              street,
              city && city !== 'Unknown' ? city : null,
              state && state !== 'Unknown' ? state : null,
              zipCode && zipCode !== '00000' ? zipCode : null
            ].filter(Boolean);
            formattedAddress = parts.length > 0 ? parts.join(', ') : (street || 'Address not available');
          }
        }

        return {
          id: branch._id.toString(),
          name: branch.name,
          slug: (branch as any).slug, // Include slug for public URL routing
          address: formattedAddress || 'Address not available', // Always return formatted string
          addressObject: branch.address, // Keep original object for detailed display
          isActive: branch.isActive,
          availableRoles: availableRoles,
          usersByRole: usersByRole
        };
      })
    );

    // Prepare logo URL - handle both Cloudinary URLs and local uploads
    let logoUrl: string | undefined;
    if (company.logo) {
      logoUrl = company.logo;
      // If it's a local upload path, prepend base URL (Cloudinary URLs are already full URLs)
      if (logoUrl.startsWith('/uploads/')) {
        const baseUrl = process.env.APP_URL || 'http://localhost:5000';
        logoUrl = `${baseUrl}${logoUrl}`;
      }
    }

    const result = {
      found: true,
      companyId: targetCompanyId,
      companyName: company.name,
      companySlug: company.slug || company.name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: logoUrl,
      branches: branchesWithRoles,
      message: 'Please select a branch, role, and enter your PIN to continue',
    };

    this.logger.log(`✅ FIND COMPANY - Success: ${company.name} with ${branchesWithRoles.length} branch(es)`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return result;
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
    
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`🔐 PIN LOGIN WITH ROLE - Starting authentication`);
    this.logger.log(`🏢 Company ID: ${companyId}`);
    this.logger.log(`📍 Branch ID: ${branchId}`);
    this.logger.log(`🎭 Role: ${role}`);
    this.logger.log(`👤 User ID: ${userId || 'N/A (will find by role)'}`);
    this.logger.log(`🔑 PIN: ***REDACTED***`);
    this.logger.log(`🌐 IP: ${ipAddress || 'unknown'}`);
    this.logger.log(`🖥️  User Agent: ${userAgent || 'unknown'}`);

    // Find user by role and branch
    let user: any;
    if (userId) {
      this.logger.log(`🔍 Finding specific user by ID: ${userId}`);
      // If userId is provided, find specific user
      user = await this.usersService.findOne(userId);
      
      // CRITICAL: Validate user is assigned to the branch they're trying to login to
      const userBranchId = user?.branchId?.toString() || user?.branchId;
      const loginBranchId = branchId.toString();
      
      if (!user) {
        this.logger.error(`❌ User not found: ${userId}`);
        throw new UnauthorizedException('User not found');
      }
      
      if (user.role.toLowerCase() !== role.toLowerCase()) {
        this.logger.error(`❌ Role mismatch - Expected: ${role}, Got: ${user.role}`);
        throw new UnauthorizedException('Role mismatch');
      }
      
      // Owners can login to any branch in their company, but other roles must be assigned to the branch
      if (user.role.toLowerCase() !== 'owner' && userBranchId !== loginBranchId) {
        this.logger.error(`❌ User ${userId} is not assigned to branch ${branchId}. User's branch: ${userBranchId}`);
        await this.logLoginActivity({
          userId: userId || 'unknown',
          companyId,
          branchId,
          email: user.email || 'unknown',
          role: role as any,
          status: LoginStatus.FAILED,
          method: LoginMethod.PIN_ROLE,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          failureReason: `User not assigned to branch. User's branch: ${userBranchId}, Login branch: ${loginBranchId}`,
        });
        throw new UnauthorizedException('You are not assigned to this branch. Please contact your manager.');
      }
      
      // Validate company match
      const userCompanyId = user?.companyId?.toString() || user?.companyId;
      if (userCompanyId !== companyId.toString()) {
        this.logger.error(`❌ Company mismatch - User's company: ${userCompanyId}, Login company: ${companyId}`);
        throw new UnauthorizedException('Company mismatch');
      }
      
      this.logger.log(`✅ Found user: ${user.email} (${user.firstName} ${user.lastName}) - Branch: ${userBranchId}`);
    } else {
      this.logger.log(`🔍 Finding user by role and branch`);
      // Find user by role and branch - only users assigned to this branch
      const users = await this.usersService.findByBranch(branchId);
      this.logger.log(`📍 Found ${users.length} user(s) assigned to branch ${branchId}`);
      const roleUsers = users.filter(u => u.role.toLowerCase() === role.toLowerCase());
      this.logger.log(`🎭 Found ${roleUsers.length} user(s) with role ${role} in branch ${branchId}`);
      
      if (roleUsers.length === 0) {
        this.logger.error(`❌ No users found with role '${role}' assigned to branch ${branchId}`);
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
          failureReason: `No users found with role '${role}' assigned to branch ${branchId}`,
        });
        throw new UnauthorizedException(`No users found with role '${role}' assigned to this branch. Please contact your manager.`);
      }
      
      if (roleUsers.length > 1) {
        // If userId is provided, use it; otherwise throw error to request user selection
        if (!userId) {
          this.logger.warn(`⚠️  Multiple users (${roleUsers.length}) found with role '${role}' in branch ${branchId} - user selection required`);
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
            failureReason: 'Multiple users found with this role in this branch',
          });
          
          // Return the list of users so frontend can show selection
          const usersList = roleUsers.map(u => ({
            id: (u as any)._id?.toString() || (u as any).id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
          }));
          
          throw new BadRequestException({
            message: 'Multiple users found with this role in this branch. Please select a specific user.',
            users: usersList,
            code: 'MULTIPLE_USERS',
          });
        }
        
        // userId provided - find the specific user
        const selectedUser = roleUsers.find(u => 
          ((u as any)._id?.toString() || (u as any).id) === userId
        );
        
        if (!selectedUser) {
          this.logger.error(`❌ User ${userId} not found in role ${role} users for branch ${branchId}`);
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
            failureReason: `User ${userId} not found in role ${role} users`,
          });
          throw new BadRequestException('Selected user not found with this role in this branch.');
        }
        
        user = selectedUser;
        this.logger.log(`✅ Selected specific user: ${user.email} (${user.firstName} ${user.lastName}) - Branch: ${user.branchId}`);
      } else {
        user = roleUsers[0];
        this.logger.log(`✅ Selected user: ${user.email} (${user.firstName} ${user.lastName}) - Branch: ${user.branchId}`);
      }
    }

    // Verify PIN - get user with PIN field selected
    this.logger.log(`🔐 Verifying PIN for user: ${user.email}`);
    // Get the user ID safely - prefer _id from user object, fallback to id
    const userIdForLookup = (user as any)._id?.toString() || (user as any).id?.toString() || user.email;
    this.logger.log(`🔍 User ID: ${userIdForLookup}, Email: ${user.email}`);
    const userWithPin = await this.usersService.findByEmail(user.email);
    this.logger.log(`🔍 User with PIN found: ${!!userWithPin}, PIN exists: ${!!userWithPin?.pin}`);
    
    // Ensure we have a valid user object with _id
    if (!userWithPin) {
      throw new NotFoundException('User not found');
    }
    
    // Use userWithPin for all subsequent operations as it has the proper _id
    const validUserId: string =
      (userWithPin as any)._id?.toString() || (userWithPin as any).id?.toString();
    if (!validUserId || !Types.ObjectId.isValid(validUserId)) {
      this.logger.error(`❌ Invalid user ID format: ${validUserId}`);
      throw new BadRequestException('Invalid user ID format');
    }
    if (!userWithPin?.pin) {
      this.logger.error(`❌ PIN not set for user: ${user.email}`);
      // Log failed login attempt - use validUserId which was validated above
      await this.logLoginActivity({
        userId: validUserId,
        companyId: String(userWithPin.companyId),
        branchId: String(userWithPin.branchId),
        email: userWithPin.email,
        role: userWithPin.role,
        status: LoginStatus.FAILED,
        method: LoginMethod.PIN_ROLE,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        failureReason: 'PIN not set',
      });
      throw new UnauthorizedException('PIN not set for this user');
    }

    // Ensure PIN is a string and trim whitespace
    const cleanPin = String(pin).trim();
    this.logger.log(`🔍 Comparing PIN... (User PIN hash exists: ${!!userWithPin.pin}, PIN length: ${cleanPin.length}, PIN value: "${cleanPin}")`);
    const isPinValid = await PasswordUtil.compare(cleanPin, userWithPin.pin);
    this.logger.log(`🔍 PIN comparison result: ${isPinValid}`);
    // Check if account is locked BEFORE attempting PIN validation
    if (userWithPin.lockUntil && userWithPin.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (userWithPin.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingTime} minutes`,
      );
    }

    if (!isPinValid) {
      // Debug: Try comparing with original pin (in case of encoding issues)
      this.logger.log(`🔍 Retrying PIN comparison with original value...`);
      const retryResult = await PasswordUtil.compare(pin, userWithPin.pin);
      this.logger.log(`🔍 Retry PIN comparison result: ${retryResult}`);
      this.logger.error(`❌ Invalid PIN for user: ${user.email} (Role: ${user.role})`);
      
      // Increment login attempts - this will lock the account if max attempts reached
      await this.usersService.incrementLoginAttempts(validUserId);
      
      // Log failed login attempt
      await this.logLoginActivity({
        userId: validUserId,
        companyId: String(userWithPin.companyId),
        branchId: String(userWithPin.branchId),
        email: userWithPin.email,
        role: userWithPin.role,
        status: LoginStatus.FAILED,
        method: LoginMethod.PIN_ROLE,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        failureReason: 'Invalid PIN',
      });
      throw new UnauthorizedException('Invalid PIN for this role');
    }
    this.logger.log(`✅ PIN verified successfully`);

    // Generate tokens using the proper method (uses correct secrets)
    const tokens = await this.generateTokens(userWithPin);
    const { accessToken, refreshToken } = tokens;

    // Generate session ID
    const sessionId = GeneratorUtil.generateId();

    // Log successful login activity
    await this.logLoginActivity({
      userId: validUserId,
      companyId: String(userWithPin.companyId),
      branchId: String(userWithPin.branchId),
      email: userWithPin.email,
      role: userWithPin.role,
      status: LoginStatus.SUCCESS,
      method: LoginMethod.PIN_ROLE,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      sessionId,
    });

    // Create login session
    await this.loginActivityService.createLoginSession({
      userId: validUserId,
      companyId: String(userWithPin.companyId),
      branchId: String(userWithPin.branchId),
      sessionId,
      accessToken,
      refreshToken,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      loginTime: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // NOTE: We intentionally skip updateLastLogin here for PIN login to avoid
    // ObjectId casting issues from legacy data. Login activity already records
    // the last successful login time, so this is safe to omit.

    // Check if 2FA is enabled
    if (userWithPin.twoFactorEnabled) {
      const temporaryToken = await this.generateTemporaryToken(userWithPin);

      this.logger.log(`✅ PIN LOGIN WITH ROLE - 2FA Required`);
      this.logger.log(`👤 User: ${user.email} (${user.firstName} ${user.lastName})`);
      this.logger.log(`🎭 Role: ${user.role}`);
      this.logger.log(`🏢 Company: ${user.companyId}`);
      this.logger.log(`📍 Branch: ${user.branchId}`);
      this.logger.log(`🔐 Temporary token issued for 2FA verification`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return {
        success: true,
        requires2FA: true,
        temporaryToken,
        data: {
          user: {
            id: validUserId,
            email: userWithPin.email,
            firstName: userWithPin.firstName,
            lastName: userWithPin.lastName,
            role: userWithPin.role,
            companyId: userWithPin.companyId,
            branchId: userWithPin.branchId
          },
          sessionId
        },
        message: '2FA verification required. Please verify your 2FA code.',
      };
    }

    const result = {
      success: true,
      data: {
        user: {
          id: validUserId,
          email: userWithPin.email,
          firstName: userWithPin.firstName,
          lastName: userWithPin.lastName,
          role: userWithPin.role,
          companyId: userWithPin.companyId,
          branchId: userWithPin.branchId
        },
        accessToken,
        refreshToken,
        sessionId
      }
    };

    this.logger.log(`✅ PIN LOGIN WITH ROLE - Success`);
    this.logger.log(`👤 User: ${user.email} (${user.firstName} ${user.lastName})`);
    this.logger.log(`🎭 Role: ${user.role}`);
    this.logger.log(`🏢 Company: ${user.companyId}`);
    this.logger.log(`📍 Branch: ${user.branchId}`);
    this.logger.log(`🔑 Session ID: ${sessionId}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return result;
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

  // 2FA Methods
  async setup2FA(userId: string) {
    // Get user to check if 2FA is already enabled and get email
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const { secret, qrCode } = await this.twoFactorService.generateSecret(user.email);
    const backupCodes = this.twoFactorService.generateBackupCodes(10);

    // Store secret and backup codes temporarily (not enabled yet)
    // The update method now properly handles 2FA fields via UpdateUserDto
    await this.usersService.update(userId, {
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
    } as any);

    // Verify the secret was saved by retrieving it
    const userWithSecret = await this.usersService.findOneWithSecret(userId);
    if (!userWithSecret || !userWithSecret.twoFactorSecret) {
      this.logger.error(`Failed to save 2FA secret for user ${userId}`);
      throw new BadRequestException('Failed to save 2FA secret. Please try again.');
    }

    this.logger.log(`2FA setup completed for user ${userId}. Secret saved successfully.`);

    return {
      secret,
      qrCode,
      backupCodes, // Show backup codes only during setup
      message: 'Scan the QR code with your authenticator app and enter the code to enable 2FA',
    };
  }

  async enable2FA(userId: string, token: string) {
    // Need to get user with twoFactorSecret field explicitly selected
    // since it has select: false in the schema
    const user = await this.usersService.findOneWithSecret(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated. Please call /auth/2fa/setup first');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Verify the token
    this.logger.log(`🔐 Verifying 2FA token for user ${userId}`);
    this.logger.log(`🔑 Secret exists: ${!!user.twoFactorSecret}`);
    this.logger.log(`🔑 Secret length: ${user.twoFactorSecret?.length || 0}`);
    this.logger.log(`🔑 Token received: ${token}`);
    
    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    this.logger.log(`✅ Token verification result: ${isValid}`);
    
    if (!isValid) {
      this.logger.error(`❌ Invalid 2FA token for user ${userId}. Token: ${token}, Secret length: ${user.twoFactorSecret?.length || 0}`);
      throw new BadRequestException('Invalid 2FA token. Please make sure you entered the correct 6-digit code from your authenticator app.');
    }

    // Enable 2FA
    await this.usersService.update(userId, {
      twoFactorEnabled: true,
    } as any);

    return {
      message: '2FA enabled successfully',
      backupCodes: user.twoFactorBackupCodes || [],
    };
  }

  async disable2FA(userId: string, password: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify password before disabling
    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    await this.usersService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: [],
    } as any);

    return {
      message: '2FA disabled successfully',
    };
  }

  async verify2FAToken(userId: string, token: string, backupCode?: string): Promise<boolean> {
    const user = await this.usersService.findOneWithSecret(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      this.logger.debug(`❌ verify2FAToken: User ${userId} - enabled: ${user?.twoFactorEnabled}, has secret: ${!!user?.twoFactorSecret}`);
      return false;
    }

    // Try backup code first if provided
    if (backupCode && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      const isValidBackup = this.twoFactorService.verifyBackupCode(backupCode, user.twoFactorBackupCodes);
      if (isValidBackup) {
        // Remove used backup code
        const updatedCodes = this.twoFactorService.removeBackupCode(backupCode, user.twoFactorBackupCodes);
        await this.usersService.update(userId, {
          twoFactorBackupCodes: updatedCodes,
        } as any);
        return true;
      }
    }

    // Verify TOTP token
    this.logger.log(`🔍 Verifying 2FA token for user ${userId}. Token: ${token}, Secret exists: ${!!user.twoFactorSecret}`);
    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    this.logger.log(`🔍 Verification result: ${isValid}`);
    return isValid;
  }

  async regenerateBackupCodes(userId: string, password: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate new backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes(10);
    await this.usersService.update(userId, {
      twoFactorBackupCodes: backupCodes,
    } as any);

    return {
      backupCodes,
      message: 'Backup codes regenerated successfully',
    };
  }

  async verify2FALogin(verify2FALoginDto: Verify2FALoginDto) {
    const { temporaryToken, token, backupCode } = verify2FALoginDto;

    // Verify the temporary token
    const payload = this.jwtService.verify(temporaryToken, {
      secret: this.configService.get('jwt.secret'),
    });

    if (!payload || !payload.sub || !payload.twoFactorRequired) {
      throw new UnauthorizedException('Invalid temporary token');
    }

    // Get the user with 2FA secret (needs findOneWithSecret to include select: false fields)
    const user = await this.usersService.findOneWithSecret(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user ID safely
    const userId = (user as any).id || (user as any)._id?.toString();

    // Verify 2FA token
    const is2FAValid = await this.verify2FAToken(userId, token, backupCode);
    if (!is2FAValid) {
      this.logger.error(`❌ 2FA verification failed for user ${userId}. Token: ${token}, Has secret: ${!!user.twoFactorSecret}`);
      throw new UnauthorizedException('Invalid 2FA token or backup code');
    }

    // Generate full access tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);

    return {
      user: {
        id: userId,
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

