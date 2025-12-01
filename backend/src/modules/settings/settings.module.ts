import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { LoginSecurityService } from './login-security.service';
import {
    CompanySettings,
    CompanySettingsSchema,
} from './schemas/company-settings.schema';
import {
    InvoiceSettings,
    InvoiceSettingsSchema,
} from './schemas/invoice-settings.schema';
import {
    ServiceChargeSetting,
    ServiceChargeSettingSchema,
} from './schemas/service-charge-setting.schema';
import {
    SystemSettings,
    SystemSettingsSchema,
} from './schemas/system-settings.schema';
import {
    TaxSetting,
    TaxSettingSchema,
} from './schemas/tax-setting.schema';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaxSetting.name, schema: TaxSettingSchema },
      {
        name: ServiceChargeSetting.name,
        schema: ServiceChargeSettingSchema,
      },
      { name: CompanySettings.name, schema: CompanySettingsSchema },
      { name: InvoiceSettings.name, schema: InvoiceSettingsSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
    CompaniesModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, LoginSecurityService],
  exports: [SettingsService, LoginSecurityService],
})
export class SettingsModule {}

