import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { Ingredient, IngredientSchema } from './schemas/ingredient.schema';
import { Wastage, WastageSchema } from '../wastage/schemas/wastage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ingredient.name, schema: IngredientSchema },
      { name: Wastage.name, schema: WastageSchema },
    ]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => PurchaseOrdersModule),
  ],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}

