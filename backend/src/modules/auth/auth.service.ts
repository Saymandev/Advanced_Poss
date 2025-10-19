import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { PasswordUtil } from '../../common/utils/password.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
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
      companyId: user.companyId,
      branchId: user.branchId,
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

  async findCompany(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        found: false,
        message: 'No restaurant found with this email',
      };
    }

    return {
      found: true,
      companyId: user.companyId,
      branchId: user.branchId,
      message: 'Company found',
    };
  }
}

