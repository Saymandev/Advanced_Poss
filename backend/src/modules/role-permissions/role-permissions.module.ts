import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import {
    RolePermission,
    RolePermissionSchema,
} from './schemas/role-permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RolePermission.name, schema: RolePermissionSchema },
    ]),
  ],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService],
  exports: [RolePermissionsService],
})
export class RolePermissionsModule {}

