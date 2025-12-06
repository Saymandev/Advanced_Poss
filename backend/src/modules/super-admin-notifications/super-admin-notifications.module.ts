import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsocketsModule } from '../websockets/websockets.module';
import { SuperAdminNotification, SuperAdminNotificationSchema } from './schemas/super-admin-notification.schema';
import { SuperAdminNotificationsController } from './super-admin-notifications.controller';
import { SuperAdminNotificationsService } from './super-admin-notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SuperAdminNotification.name, schema: SuperAdminNotificationSchema },
    ]),
    WebsocketsModule,
  ],
  controllers: [SuperAdminNotificationsController],
  providers: [SuperAdminNotificationsService],
  exports: [SuperAdminNotificationsService],
})
export class SuperAdminNotificationsModule {}

