
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequiresFeature, REQUIRES_FEATURE } from '../decorators/requires-feature.decorator';
import { UserRole } from '../enums/user-role.enum';
import { RolePermissionsService } from '../../modules/role-permissions/role-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(
        private reflector: Reflector,
        private rolePermissionsService: RolePermissionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeatures = this.reflector.getAllAndOverride<string | string[]>(REQUIRES_FEATURE, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredFeatures) {
            return true; // No feature requirement, allow access
        }

        // Convert to array if it's a single string for backward compatibility
        const features = Array.isArray(requiredFeatures) ? requiredFeatures : [requiredFeatures];

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            this.logger.warn('User not found in request');
            throw new ForbiddenException('User not authenticated');
        }

        // Super admin bypasses all checks
        if (user.role === UserRole.SUPER_ADMIN) {
            return true;
        }

        if (!user.companyId) {
            // If no companyId, we can't check permissions. 
            // Assuming non-super-admin users MUST belong to a company for feature access.
            this.logger.warn(`User ${user.id} missing companyId`);
            throw new ForbiddenException('User missing company information');
        }

        try {
            // Get effective permissions for this user's role in this company
            const rolePermission = await this.rolePermissionsService.getRolePermission(
                user.companyId,
                user.role,
            );

            if (!rolePermission) {
                this.logger.warn(`No permissions found for role ${user.role} in company ${user.companyId}`);
                return false;
            }

            // Check if user has ANY of the required features
            const hasAccess = features.some(feature => rolePermission.features.includes(feature));

            if (hasAccess) {
                return true;
            }

            this.logger.warn(`User ${user.id} (Role: ${user.role}) denied access to ${features.join(' or ')}`);
            throw new ForbiddenException(`You do not have permission to access ${features.join(' or ')}`);

        } catch (error) {
            if (error instanceof ForbiddenException) throw error;

            this.logger.error(`Error verifying permissions: ${error.message}`, error.stack);
            throw new ForbiddenException('Could not verify permissions');
        }
    }
}
