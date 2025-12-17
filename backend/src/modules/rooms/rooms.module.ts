import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { Room, RoomSchema } from './schemas/room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
    ]),
    forwardRef(() => BranchesModule),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}

