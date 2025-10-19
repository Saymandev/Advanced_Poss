import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async getSettings(companyId: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      _id: company._id,
      name: company.name,
      companyType: company.companyType,
      operationType: company.operationType,
      email: company.email,
      country: company.country,
      timeZone: company.timeZone,
      invoiceSubtitle: company.invoiceSubtitle,
      invoiceFootnote: company.invoiceFootnote,
      invoiceCurrency: company.invoiceCurrency,
      vatEnabled: company.vatEnabled,
      vatPercentage: company.vatPercentage,
      serviceChargeEnabled: company.serviceChargeEnabled,
      serviceChargePercentage: company.serviceChargePercentage,
      kitchenControl: company.kitchenControl,
      printKitchenLabel: company.printKitchenLabel,
      invoiceLogo: company.invoiceLogo,
      invoiceRatingQr: company.invoiceRatingQr,
      dailyReport: company.dailyReport,
      deductStockByRecipe: company.deductStockByRecipe,
      companyLogo: company.logo,
      onlineOrderingUrl: company.onlineOrderingUrl,
      qrCodeUrl: company.qrCodeUrl,
    };
  }

  async updateSettings(companyId: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      updateCompanyDto,
      { new: true },
    ).exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.getSettings(companyId);
  }

  async uploadLogo(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // In a real application, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll just store the file path
    const logoUrl = `/uploads/company-logos/${file.filename}`;

    await this.companyModel.findByIdAndUpdate(
      companyId,
      { logo: logoUrl },
      { new: true },
    ).exec();

    return { logoUrl };
  }

  async generateQRCode(companyId: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const onlineUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/${companyId}`;
    
    try {
      const qrCodeUrl = await QRCode.toDataURL(onlineUrl, {
        width: 256,
        margin: 2,
      });

      // Update company with QR code URL
      await this.companyModel.findByIdAndUpdate(
        companyId,
        { 
          qrCodeUrl,
          onlineOrderingUrl: onlineUrl,
        },
        { new: true },
      ).exec();

      return { qrCodeUrl, onlineUrl };
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  async getOnlineUrl(companyId: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      onlineOrderingUrl: company.onlineOrderingUrl,
      qrCodeUrl: company.qrCodeUrl,
    };
  }
}
