import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { getAccessToken } from '../../../common/utils/cookie.util';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        // Try cookie first (new method), fallback to Authorization header (backward compatibility)
        return getAccessToken(req);
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    this.logger.log(`🔍 JWT Strategy - Validating token`);
    this.logger.log(`👤 User ID from token (payload.sub): ${payload.sub}`);
    this.logger.log(`📧 Email from token: ${payload.email}`);
    this.logger.log(`🎭 Role from token: ${payload.role}`);
    
    try {
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user) {
        this.logger.error(`❌ User not found with ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found or inactive');
      }

      this.logger.log(`✅ User found: ${user.email} (${(user as any).firstName} ${(user as any).lastName})`);
      this.logger.log(`🔍 User isActive: ${user.isActive}`);
      
      if (!user.isActive) {
        this.logger.error(`❌ User is inactive: ${user.email}`);
        throw new UnauthorizedException('User not found or inactive');
      }

      this.logger.log(`✅ JWT Strategy - Validation successful`);
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: user.companyId?.toString(),
        branchId: user.branchId?.toString(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`❌ Error validating user: ${error.message}`);
      this.logger.error(`📋 Error stack: ${error.stack}`);
      throw new UnauthorizedException('User not found or inactive');
    }
  }
}

