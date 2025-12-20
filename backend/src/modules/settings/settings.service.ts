import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompaniesService } from '../companies/companies.service';
import {
  CreateServiceChargeSettingDto,
} from './dto/create-service-charge-setting.dto';
import { CreateTaxSettingDto } from './dto/create-tax-setting.dto';
import {
  UpdateCompanySettingsDto,
} from './dto/update-company-settings.dto';
import {
  UpdateInvoiceSettingsDto,
} from './dto/update-invoice-settings.dto';
import {
  UpdateServiceChargeSettingDto,
} from './dto/update-service-charge-setting.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { UpdateTaxSettingDto } from './dto/update-tax-setting.dto';
import {
  CompanySettings,
  CompanySettingsDocument,
} from './schemas/company-settings.schema';
import {
  InvoiceSettings,
  InvoiceSettingsDocument,
} from './schemas/invoice-settings.schema';
import {
  ServiceChargeSetting,
  ServiceChargeSettingDocument,
} from './schemas/service-charge-setting.schema';
import {
  SystemSettings,
  SystemSettingsDocument,
} from './schemas/system-settings.schema';
import {
  TaxSetting,
  TaxSettingDocument,
} from './schemas/tax-setting.schema';
@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(TaxSetting.name)
    private readonly taxModel: Model<TaxSettingDocument>,
    @InjectModel(ServiceChargeSetting.name)
    private readonly serviceChargeModel: Model<ServiceChargeSettingDocument>,
    @InjectModel(CompanySettings.name)
    private readonly companySettingsModel: Model<CompanySettingsDocument>,
    @InjectModel(InvoiceSettings.name)
    private readonly invoiceSettingsModel: Model<InvoiceSettingsDocument>,
    @InjectModel(SystemSettings.name)
    private readonly systemSettingsModel: Model<SystemSettingsDocument>,
    private readonly companiesService: CompaniesService,
  ) {}
  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid identifier supplied');
    }
    return new Types.ObjectId(id);
  }
  private async assertCompany(companyId: string) {
    await this.companiesService.findOne(companyId);
  }
  async getCompanySettings(companyId: string) {
    await this.assertCompany(companyId);
    const existing = await this.companySettingsModel
      .findOne({ companyId: this.toObjectId(companyId) })
      .lean();
    if (existing) {
      return existing;
    }
    const created = await this.companySettingsModel.create({
      companyId: this.toObjectId(companyId),
    });
    return created.toJSON();
  }
  async updateCompanySettings(
    companyId: string,
    payload: UpdateCompanySettingsDto,
  ) {
    await this.assertCompany(companyId);
    const updated = await this.companySettingsModel
      .findOneAndUpdate(
        { companyId: this.toObjectId(companyId) },
        { $set: payload },
        { new: true, upsert: true },
      )
      .lean();
    return updated;
  }
  async getInvoiceSettings(companyId: string) {
    await this.assertCompany(companyId);
    const existing = await this.invoiceSettingsModel
      .findOne({ companyId: this.toObjectId(companyId) })
      .lean();
    if (existing) {
      return existing;
    }
    const created = await this.invoiceSettingsModel.create({
      companyId: this.toObjectId(companyId),
    });
    return created.toJSON();
  }
  async updateInvoiceSettings(
    companyId: string,
    payload: UpdateInvoiceSettingsDto,
  ) {
    await this.assertCompany(companyId);
    const updated = await this.invoiceSettingsModel
      .findOneAndUpdate(
        { companyId: this.toObjectId(companyId) },
        { $set: payload },
        { new: true, upsert: true },
      )
      .lean();
    return updated;
  }
  async listTaxSettings(companyId: string) {
    await this.assertCompany(companyId);
    return this.taxModel
      .find({ companyId: this.toObjectId(companyId) })
      .sort({ createdAt: -1 })
      .lean();
  }
  async createTaxSetting(payload: CreateTaxSettingDto) {
    await this.assertCompany(payload.companyId);
    try {
      const created = await this.taxModel.create({
        ...payload,
        companyId: this.toObjectId(payload.companyId),
      });
      return created.toJSON();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('A tax with this name already exists');
      }
      throw error;
    }
  }
  async updateTaxSetting(id: string, payload: UpdateTaxSettingDto) {
    const updated = await this.taxModel
      .findByIdAndUpdate(id, payload, { new: true })
      .lean();
    if (!updated) {
      throw new NotFoundException('Tax setting not found');
    }
    return updated;
  }
  async deleteTaxSetting(id: string) {
    const deleted = await this.taxModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Tax setting not found');
    }
  }
  async listServiceChargeSettings(companyId: string) {
    await this.assertCompany(companyId);
    return this.serviceChargeModel
      .find({ companyId: this.toObjectId(companyId) })
      .sort({ createdAt: -1 })
      .lean();
  }
  async createServiceChargeSetting(payload: CreateServiceChargeSettingDto) {
    await this.assertCompany(payload.companyId);
    try {
      const created = await this.serviceChargeModel.create({
        ...payload,
        companyId: this.toObjectId(payload.companyId),
      });
      return created.toJSON();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException(
          'A service charge with this name already exists',
        );
      }
      throw error;
    }
  }
  async updateServiceChargeSetting(
    id: string,
    payload: UpdateServiceChargeSettingDto,
  ) {
    const updated = await this.serviceChargeModel
      .findByIdAndUpdate(id, payload, { new: true })
      .lean();
    if (!updated) {
      throw new NotFoundException('Service charge setting not found');
    }
    return updated;
  }
  async deleteServiceChargeSetting(id: string) {
    const deleted = await this.serviceChargeModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Service charge setting not found');
    }
  }
  // System Settings methods (Super Admin only)
  private cleanSystemSettings(settings: any): SystemSettings {
    // Remove MongoDB internal fields
    const { _id, __v, createdAt, updatedAt, ...cleanSettings } = settings || {};
    return cleanSettings as SystemSettings;
  }
  async getSystemSettings(): Promise<SystemSettings> {
    // There should only be one system settings document
    let settings = await this.systemSettingsModel.findOne().lean().exec();
    if (!settings) {
      // Create default system settings with BD-based defaults if none exist
      const defaultSettings = await this.systemSettingsModel.create({
        defaultCompanySettings: {
          currency: 'BDT',
          timezone: 'Asia/Dhaka',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          language: 'en',
        },
      });
      settings = defaultSettings.toJSON();
    } else {
      // Always ensure BD defaults are set (force update to correct values)
      const currentSettings = settings.defaultCompanySettings;
      const shouldUpdate = 
        !currentSettings ||
        currentSettings.currency !== 'BDT' ||
        currentSettings.timezone !== 'Asia/Dhaka' ||
        currentSettings.dateFormat !== 'DD/MM/YYYY' ||
        currentSettings.timeFormat !== '12h' ||
        currentSettings.language !== 'en';
      if (shouldUpdate) {
        // Update to BD defaults (BDT, Asia/Dhaka, DD/MM/YYYY, 12h, en)
        const updated = await this.systemSettingsModel.findOneAndUpdate(
          {},
          {
            $set: {
              'defaultCompanySettings.currency': 'BDT',
              'defaultCompanySettings.timezone': 'Asia/Dhaka',
              'defaultCompanySettings.dateFormat': 'DD/MM/YYYY',
              'defaultCompanySettings.timeFormat': '12h',
              'defaultCompanySettings.language': 'en',
            },
          },
          { new: true, upsert: true }
        ).lean().exec();
        settings = updated;
      }
    }
    return this.cleanSystemSettings(settings);
  }
  async updateSystemSettings(payload: UpdateSystemSettingsDto): Promise<SystemSettings> {
    const updated = await this.systemSettingsModel
      .findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true })
      .lean()
      .exec();
    return this.cleanSystemSettings(updated);
  }
}