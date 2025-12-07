import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { POSSettings, POSSettingsSchema } from '../pos/schemas/pos-settings.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { Table, TableSchema } from './schemas/table.schema';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: POSSettings.name, schema: POSSettingsSchema },
    ]),
    forwardRef(() => BranchesModule),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard (circular dependency)
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard (Subscription model) (circular dependency)
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}

