import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { BranchesModule } from '../branches/branches.module';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { CompaniesModule } from '../companies/companies.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    forwardRef(() => CompaniesModule),
    forwardRef(() => BranchesModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard (circular dependency)
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard (circular dependency)
  ],
  controllers: [UsersController],
  providers: [UsersService, CloudinaryService],
  exports: [UsersService],
})
export class UsersModule {}

