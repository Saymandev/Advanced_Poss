import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { RolePermissionsService } from './role-permissions.service';
@ApiTags('Role Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) { }
  @Get()
  @ApiOperation({ summary: 'Get all role permissions for company' })
  getRolePermissions(@CurrentUser('companyId') companyId: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can view all role permissions');
    }
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    return this.rolePermissionsService.getRolePermissions(companyId);
  }
  @Get('my-permissions')
  @ApiOperation({ summary: 'Get current user\'s role permissions' })
  getMyPermissions(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
  ) {
    if (!companyId) {
      console.error(`[RolePermissionsController] Company ID is missing`);
      throw new Error('Company ID is required');
    }
    if (!role) {
      console.error(`[RolePermissionsController] User role is missing`);
      throw new Error('User role is required');
    }
    return this.rolePermissionsService.getRolePermission(companyId, role.toLowerCase());
  }
  @Patch()
  @ApiOperation({ summary: 'Update role permissions (owner only)' })
  updateRolePermission(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateRolePermissionDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can update role permissions');
    }
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    return this.rolePermissionsService.updateRolePermission(
      companyId,
      updateDto,
      userId,
    );
  }
  @Get('system/company/:companyId')
  @ApiOperation({ summary: 'Get role permissions for any company (Super Admin only)' })
  getCompanyRolePermissions(@Param('companyId') companyId: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can view role permissions for any company');
    }
    return this.rolePermissionsService.getRolePermissions(companyId);
  }
  @Patch('system/company/:companyId')
  @ApiOperation({ summary: 'Update role permissions for any company (Super Admin only)' })
  updateCompanyRolePermission(
    @Param('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateRolePermissionDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can update role permissions for any company');
    }
    return this.rolePermissionsService.updateRolePermission(
      companyId,
      updateDto,
      userId,
    );
  }
}
