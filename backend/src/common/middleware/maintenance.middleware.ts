import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NextFunction, Request, Response } from 'express';
import { Model } from 'mongoose';
import { SystemSettings, SystemSettingsDocument } from '../../modules/settings/schemas/system-settings.schema';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private cache: { enabled: boolean; message: string; lastChecked: number } | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds cache to reduce DB queries

  constructor(
    @InjectModel(SystemSettings.name)
    private systemSettingsModel: Model<SystemSettingsDocument>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip maintenance check for super admin routes
    const superAdminRoutes = [
      '/api/v1/auth/super-admin',
      '/api/v1/settings/system',
    ];

    if (superAdminRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Skip maintenance check for health checks and public endpoints
    const publicRoutes = [
      '/health',
      '/api/v1/health',
      '/api/v1/subscription-plans', // Allow viewing plans during maintenance
    ];

    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Check if user is super admin (bypass maintenance mode)
    const user = req.user as any;
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN';
    
    if (isSuperAdmin) {
      return next();
    }

    try {
      // Check cache first
      const now = Date.now();
      if (this.cache && (now - this.cache.lastChecked) < this.CACHE_TTL) {
        if (this.cache.enabled) {
          throw new ServiceUnavailableException({
            message: this.cache.message || 'System is under maintenance. Please try again later.',
            code: 'MAINTENANCE_MODE',
          });
        }
        return next();
      }

      // Fetch from database
      let settings = await this.systemSettingsModel.findOne().lean().exec();
      
      // If no settings exist, create default (maintenance mode off)
      if (!settings) {
        settings = {
          maintenanceMode: false,
          maintenanceMessage: 'System is under maintenance. Please try again later.',
        } as any;
      }

      // Update cache
      this.cache = {
        enabled: settings.maintenanceMode || false,
        message: settings.maintenanceMessage || 'System is under maintenance. Please try again later.',
        lastChecked: now,
      };

      // Block request if maintenance mode is enabled
      if (settings.maintenanceMode) {
        throw new ServiceUnavailableException({
          message: settings.maintenanceMessage || 'System is under maintenance. Please try again later.',
          code: 'MAINTENANCE_MODE',
        });
      }

      return next();
    } catch (error) {
      // If it's already a ServiceUnavailableException (maintenance mode), re-throw it
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      // For other errors, log and continue (don't block on DB errors)
      console.error('Maintenance middleware error:', error);
      return next();
    }
  }
}

