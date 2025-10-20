import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CompaniesModule } from './modules/companies/companies.module';
import { CompanyModule } from './modules/company/company.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { LoginActivityModule } from './modules/login-activity/login-activity.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SubscriptionPlansModule } from './modules/subscriptions/subscription-plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TablesModule } from './modules/tables/tables.module';
import { UsersModule } from './modules/users/users.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { WorkPeriodsModule } from './modules/work-periods/work-periods.module';

// Common
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    CompanyModule,
    BranchesModule,
    CategoriesModule,
    MenuItemsModule,
    TablesModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    IngredientsModule,
    SuppliersModule,
    ExpensesModule,
    AttendanceModule,
    SubscriptionsModule,
    LoginActivityModule,
    SubscriptionPlansModule,
    BackupsModule,
    ReportsModule,
    KitchenModule,
    AiModule,
    WebsocketsModule,
    WorkPeriodsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

