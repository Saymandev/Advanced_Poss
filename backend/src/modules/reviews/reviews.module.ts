import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
    ]),
    CustomersModule,
    WebsocketsModule,
    SubscriptionsModule, // For subscription limit validation
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

