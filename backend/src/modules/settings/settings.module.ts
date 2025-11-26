import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
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
    ]),
    CompaniesModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

