import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import {
  RolePermission,
  RolePermissionDocument,
} from './schemas/role-permission.schema';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectModel(RolePermission.name)
    private rolePermissionModel: Model<RolePermissionDocument>,
  ) {}

  async getRolePermissions(companyId: string): Promise<RolePermission[]> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const permissions = await this.rolePermissionModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .lean()
      .exec();

    // If no permissions exist, initialize with defaults
    if (permissions.length === 0) {
      return await this.initializeDefaultPermissions(companyId);
    }

    return permissions.map((perm: any) => ({
      ...perm,
      id: perm._id.toString(),
    }));
  }

  async getRolePermission(
    companyId: string,
    role: string,
  ): Promise<RolePermission | null> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const permission = await this.rolePermissionModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        role,
      })
      .lean()
      .exec();

    if (!permission) {
      // If permission doesn't exist, initialize default permissions for the company
      // This ensures users always have permissions
      const allPermissions = await this.initializeDefaultPermissions(companyId);
      const defaultPermission = allPermissions.find((p) => p.role === role);
      return defaultPermission || null;
    }

    return {
      ...permission,
      id: permission._id.toString(),
    } as RolePermission;
  }

  async updateRolePermission(
    companyId: string,
    updateDto: UpdateRolePermissionDto,
    updatedBy?: string,
  ): Promise<RolePermission> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const updateData: any = {
      companyId: new Types.ObjectId(companyId),
      role: updateDto.role,
      features: updateDto.features,
    };

    if (updatedBy && Types.ObjectId.isValid(updatedBy)) {
      updateData.updatedBy = new Types.ObjectId(updatedBy);
    }

    const permission = await this.rolePermissionModel
      .findOneAndUpdate(
        {
          companyId: new Types.ObjectId(companyId),
          role: updateDto.role,
        },
        updateData,
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return {
      ...permission,
      id: permission._id.toString(),
    } as RolePermission;
  }

  async initializeDefaultPermissions(
    companyId: string,
  ): Promise<RolePermission[]> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    // Default feature sets for each role
    const defaultPermissions = {
      owner: [
        'dashboard',
        'reports',
        'staff-management',
        'role-management',
        'attendance',
        'menu-management',
        'categories',
        'order-management',
        'table-management',
        'kitchen-display',
        'customer-management',
        'loyalty-program',
        'inventory',
        'suppliers',
        'purchase-orders',
        'expenses',
        'accounting',
        'work-periods',
        'settings',
        'branches',
        'notifications',
      ],
      manager: [
        'dashboard',
        'reports',
        'staff-management',
        'attendance',
        'menu-management',
        'categories',
        'order-management',
        'table-management',
        'kitchen-display',
        'customer-management',
        'loyalty-program',
        'inventory',
        'suppliers',
        'expenses',
        'work-periods',
        'notifications',
      ],
      chef: [
        'dashboard',
        'menu-management',
        'categories',
        'kitchen-display',
        'inventory',
        'purchase-orders',
        'notifications',
      ],
      waiter: [
        'dashboard',
        'order-management',
        'table-management',
        'customer-management',
        'notifications',
      ],
      cashier: [
        'dashboard',
        'order-management',
        'customer-management',
        'expenses',
        'work-periods',
        'notifications',
      ],
    };

    const createdPermissions: RolePermission[] = [];

    for (const [role, features] of Object.entries(defaultPermissions)) {
      const permission = await this.rolePermissionModel
        .findOneAndUpdate(
          {
            companyId: new Types.ObjectId(companyId),
            role,
          },
          {
            companyId: new Types.ObjectId(companyId),
            role,
            features,
          },
          { upsert: true, new: true },
        )
        .lean()
        .exec();

      createdPermissions.push({
        ...permission,
        id: permission._id.toString(),
      } as RolePermission);
    }

    return createdPermissions;
  }
}

