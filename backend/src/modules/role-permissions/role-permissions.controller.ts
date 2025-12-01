import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { RolePermissionsService } from './role-permissions.service';

@ApiTags('Role Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all role permissions for company' })
  getRolePermissions(@CurrentUser('companyId') companyId: string) {
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
      throw new Error('Company ID is required');
    }
    if (!role) {
      throw new Error('User role is required');
    }
    return this.rolePermissionsService.getRolePermission(companyId, role.toLowerCase());
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update role permissions (owner only)' })
  updateRolePermission(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateRolePermissionDto,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get role permissions for any company (Super Admin only)' })
  getCompanyRolePermissions(@Param('companyId') companyId: string) {
    return this.rolePermissionsService.getRolePermissions(companyId);
  }

  @Patch('system/company/:companyId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update role permissions for any company (Super Admin only)' })
  updateCompanyRolePermission(
    @Param('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateRolePermissionDto,
  ) {
    return this.rolePermissionsService.updateRolePermission(
      companyId,
      updateDto,
      userId,
    );
  }
}

