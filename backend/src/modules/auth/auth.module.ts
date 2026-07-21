import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { LoginActivityModule } from '../login-activity/login-activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { SettingsModule } from '../settings/settings.module';
import { SystemSettings, SystemSettingsSchema } from '../settings/schemas/system-settings.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SuperAdminNotificationsModule } from '../super-admin-notifications/super-admin-notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => CompaniesModule),
    forwardRef(() => BranchesModule),
    forwardRef(() => SubscriptionPlansModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => LoginActivityModule),
    forwardRef(() => SuperAdminNotificationsModule),
    forwardRef(() => NotificationsModule),
    SettingsModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
    RolePermissionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TwoFactorService, JwtStrategy, LocalStrategy, EmailService, SmsService],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule { }

