import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NextFunction, Request, Response } from 'express';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../modules/companies/schemas/company.schema';

@Injectable()
export class SubscriptionLockMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip subscription check for auth routes and public routes
    const publicRoutes = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/payments/webhook',
      '/api/v1/subscription-plans',
    ];

    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Skip if no user in request (not authenticated)
    if (!req.user || !(req.user as any).companyId) {
      return next();
    }

    try {
      const company = await this.companyModel.findById((req.user as any).companyId);
      
      if (!company) {
        throw new UnauthorizedException('Company not found');
      }

      // Check if account is locked due to expired subscription
      if (company.subscriptionStatus === 'expired') {
        throw new UnauthorizedException({
          message: 'Your subscription has expired. Please upgrade to continue using the service.',
          code: 'SUBSCRIPTION_EXPIRED',
          subscriptionStatus: 'expired',
          upgradeUrl: '/upgrade',
        });
      }

      // Check if trial is expired
      if (company.subscriptionStatus === 'trial' && company.trialEndDate && company.trialEndDate < new Date()) {
        // Auto-lock the account
        await this.companyModel.findByIdAndUpdate(company._id, {
          subscriptionStatus: 'expired',
        });

        throw new UnauthorizedException({
          message: 'Your trial period has expired. Please upgrade to continue using the service.',
          code: 'TRIAL_EXPIRED',
          subscriptionStatus: 'expired',
          upgradeUrl: '/upgrade',
        });
      }

      // Add subscription info to request for use in controllers
      req.subscription = {
        status: company.subscriptionStatus,
        plan: company.subscriptionPlan,
        trialEndDate: company.trialEndDate,
        subscriptionEndDate: company.subscriptionEndDate,
        features: company.settings?.features || {},
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Subscription lock middleware error:', error);
      next(); // Continue if there's an error checking subscription
    }
  }
}

// Extend Request interface to include subscription info
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        status: string;
        plan: string;
        trialEndDate?: Date;
        subscriptionEndDate?: Date;
        features: any;
      };
    }
  }
}
