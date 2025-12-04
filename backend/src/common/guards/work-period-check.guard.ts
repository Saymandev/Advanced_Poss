import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { WorkPeriodsService } from '../../modules/work-periods/work-periods.service';
import { isSuperAdmin } from '../utils/query.utils';

/**
 * Guard that ensures an active work period exists before accessing POS terminal.
 * Bypasses check for owner, manager, and super_admin roles (they can access dashboard/stats without work period).
 */
@Injectable()
export class WorkPeriodCheckGuard implements CanActivate {
  constructor(private workPeriodsService: WorkPeriodsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Allow read-only POS stats endpoints for any authenticated role.
    // These are used by the dashboard and should not require an active work period.
    const originalUrl = (request as any).originalUrl || request.url || '';
    if (
      request.method === 'GET' &&
      (originalUrl.includes('/pos/stats') || originalUrl.includes('/pos/quick-stats'))
    ) {
      return true;
    }

    // Bypass for OWNER, MANAGER, and SUPER_ADMIN for full POS access
    const bypassRoles = ['owner', 'manager'];
    if (isSuperAdmin(user.role) || bypassRoles.includes(user.role?.toLowerCase())) {
      return true;
    }

    // Check if there's an active work period for the company/branch
    if (!user.companyId) {
      throw new ForbiddenException('Company ID not found');
    }

    try {
      const activeWorkPeriod = await this.workPeriodsService.findActive(
        user.companyId,
        (user as any).branchId,
      );

      if (!activeWorkPeriod) {
        throw new ForbiddenException(
          'No active work period found. Please start a work period from the Work Periods page before using the POS terminal.',
        );
      }

      return true;
    } catch (error: any) {
      // If it's already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Otherwise, allow access (don't block if work period check fails for other reasons)
      console.warn('Work period check failed:', error.message);
      return true;
    }
  }
}

