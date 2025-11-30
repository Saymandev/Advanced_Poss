import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolePermissionsService } from '../../modules/role-permissions/role-permissions.service';
import { REQUIRES_ROLE_FEATURE } from '../decorators/requires-role-feature.decorator';

@Injectable()
export class RoleFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolePermissionsService: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      REQUIRES_ROLE_FEATURE,
      context.getHandler(),
    );

    if (!requiredFeature) {
      return true; // No feature requirement, allow access
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      throw new ForbiddenException('User role not found');
    }

    // Get role permissions for the user's role
    const rolePermission = await this.rolePermissionsService.getRolePermission(
      user.companyId,
      user.role.toLowerCase(),
    );

    if (!rolePermission) {
      throw new ForbiddenException(
        `Role permissions not found for role: ${user.role}`,
      );
    }

    // Check if the role has the required feature
    const hasFeature = rolePermission.features.includes(requiredFeature);

    if (!hasFeature) {
      throw new ForbiddenException(
        `Access denied. Required feature: ${requiredFeature}`,
      );
    }

    return true;
  }
}

