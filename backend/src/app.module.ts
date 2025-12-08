import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import * as redisStore from 'cache-manager-redis-store';

// Configuration
import configuration from './config/configuration';

// Modules
import { AiModule } from './modules/ai/ai.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BackupsModule } from './modules/backups/backups.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CmsModule } from './modules/cms/cms.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { Company, CompanySchema } from './modules/companies/schemas/company.schema';
import { CompanyModule } from './modules/company/company.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DeliveryZonesModule } from './modules/delivery-zones/delivery-zones.module';
import { DigitalReceiptsModule } from './modules/digital-receipts/digital-receipts.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { LoginActivityModule } from './modules/login-activity/login-activity.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { POSModule } from './modules/pos/pos.module';
import { PublicModule } from './modules/public/public.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { QRCodesModule } from './modules/qr-codes/qr-codes.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SystemSettings, SystemSettingsSchema } from './modules/settings/schemas/system-settings.schema';
import { SettingsModule } from './modules/settings/settings.module';
import { SubscriptionPaymentsModule } from './modules/subscription-payments/subscription-payments.module';
import { SubscriptionPlansModule } from './modules/subscriptions/subscription-plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SuperAdminNotificationsModule } from './modules/super-admin-notifications/super-admin-notifications.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SystemFeedbackModule } from './modules/system-feedback/system-feedback.module';
import { TablesModule } from './modules/tables/tables.module';
import { UsersModule } from './modules/users/users.module';
import { WastageModule } from './modules/wastage/wastage.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { WorkPeriodsModule } from './modules/work-periods/work-periods.module';

// Common
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { SubscriptionLockMiddleware } from './common/middleware/subscription-lock.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        password: configService.get('redis.password'),
        ttl: configService.get('redis.ttl'),
      }),
      inject: [ConfigService],
    }),

    // Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get('rateLimit.ttl') || 60,
        limit: configService.get('rateLimit.max') || 10,
      }]),
      inject: [ConfigService],
    }),

    // Schedule (Cron jobs)
    NestScheduleModule.forRoot(),

    // System Settings Schema (for maintenance middleware)
    // Company Schema (for subscription lock middleware)
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
      { name: Company.name, schema: CompanySchema },
    ]),

    // Feature Modules
    AuthModule,
    PublicModule,
    UsersModule,
    CompaniesModule,
    CompanyModule,
    BranchesModule,
    CategoriesModule,
    CmsModule,
    MenuItemsModule,
    TablesModule,
    OrdersModule,
    PaymentsModule,
    POSModule,
    CustomersModule,
    DeliveryZonesModule,
    PaymentMethodsModule,
    DigitalReceiptsModule,
    IngredientsModule,
    SuppliersModule,
    ExpensesModule,
    GalleryModule,
    AttendanceModule,
    SubscriptionsModule,
    SubscriptionPaymentsModule,
    LoginActivityModule,
    SubscriptionPlansModule,
    BackupsModule,
    MarketingModule,
    ReportsModule,
    ReviewsModule,
    WastageModule,
    RolePermissionsModule,
    SettingsModule,
    QRCodesModule,
    ScheduleModule,
    KitchenModule,
    AiModule,
    WebsocketsModule,
    WorkPeriodsModule,
    SuperAdminNotificationsModule,
    PurchaseOrdersModule,
    SystemFeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService, SubscriptionLockMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply maintenance mode middleware globally (runs first)
    consumer
      .apply(MaintenanceMiddleware)
      .forRoutes('*');
    
    // Apply subscription lock middleware globally (runs after maintenance)
    // This ensures ALL routes require an active subscription
    consumer
      .apply(SubscriptionLockMiddleware)
      .forRoutes('*');
  }
}

