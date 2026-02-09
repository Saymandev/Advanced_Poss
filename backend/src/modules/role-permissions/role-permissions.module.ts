import { Module, forwardRef, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import {
  RolePermission,
  RolePermissionSchema,
} from './schemas/role-permission.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    forwardRef(() => SubscriptionPlansModule), // Required for subscription feature filtering
  ],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService],
  exports: [RolePermissionsService],
})
export class RolePermissionsModule { }

