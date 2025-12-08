import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Wastage, WastageSchema } from './schemas/wastage.schema';
import { WastageController } from './wastage.controller';
import { WastageService } from './wastage.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wastage.name, schema: WastageSchema }]),
    IngredientsModule,
    RolePermissionsModule, // Import to use RolePermissionsService in RoleFeatureGuard
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [WastageController],
  providers: [WastageService, RoleFeatureGuard],
  exports: [WastageService],
})
export class WastageModule {}

