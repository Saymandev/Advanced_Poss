import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';
@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private cloudinaryService: CloudinaryService,
    private configService: ConfigService,
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
    // Get current company to check for existing logo
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    // Check if Cloudinary is configured
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }
    // Delete old logo from Cloudinary if it exists
    if (company.logo) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(company.logo);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        // Log error but don't fail the upload if deletion fails
        console.warn('Failed to delete old logo from Cloudinary:', error);
      }
    }
    // Upload new logo to Cloudinary
    try {
      // Ensure we have a buffer
      if (!file.buffer) {
        throw new Error('File buffer is missing. Multer must be configured with memory storage.');
      }
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'company-logos',
        `company-${companyId}-logo`, // Use company ID as public ID for easy replacement
      );
      if (!uploadResult || !uploadResult.secure_url) {
        throw new Error('Cloudinary upload failed: No secure URL returned');
      }
      // Update company with Cloudinary URL
      await this.companyModel.findByIdAndUpdate(
        companyId,
        { logo: uploadResult.secure_url },
        { new: true },
      ).exec();
      return { logoUrl: uploadResult.secure_url };
    } catch (error) {
      console.error('Cloudinary upload error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw new Error(
        `Failed to upload logo to Cloudinary: ${error.message || 'Unknown error'}`,
      );
    }
  }
  async generateQRCode(companyId: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const onlineUrl = `${baseUrl.replace(/\/$/, '')}/order/${companyId}`;
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
