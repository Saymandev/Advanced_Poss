import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only apply tenant isolation if the user is authenticated
    if (user && user.companyId) {
      // Allow super_admin to query any company
      if (user.role === UserRole.SUPER_ADMIN || user.role === 'super_admin') {
        return next.handle();
      }

      // 1. Check and Enforce Query Parameters (GET requests mostly)
      if (request.query && request.query.companyId) {
        if (request.query.companyId !== user.companyId) {
          this.logger.error(`SECURITY ALERT: User ${user.id} from Company ${user.companyId} attempted to access Company ${request.query.companyId}`);
          throw new ForbiddenException('Security Violation: You cannot access data outside of your company.');
        }
      } else if (request.query) {
        // Automatically inject it so the developer doesn't have to
        request.query.companyId = user.companyId;
      } else {
        request.query = { companyId: user.companyId };
      }
    }

    return next.handle();
  }
}
