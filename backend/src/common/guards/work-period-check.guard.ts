import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { WorkPeriodsService } from '../../modules/work-periods/work-periods.service';
import { isSuperAdmin } from '../utils/query.utils';

/**
 * Guard that ensures an active work period exists before accessing POS terminal.
 * Bypasses check for owner, manager, and super_admin roles.
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

    // Bypass for OWNER and SUPER_ADMIN only (managers MUST start work period)
    const bypassRoles = ['owner', 'super_admin'];
    if (isSuperAdmin(user.role) || bypassRoles.includes(user.role?.toLowerCase())) {
      return true;
    }

    // Check if there's an active work period for the company
    if (!user.companyId) {
      throw new ForbiddenException('Company ID not found');
    }

    try {
      const activeWorkPeriod = await this.workPeriodsService.findActive(user.companyId);

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

