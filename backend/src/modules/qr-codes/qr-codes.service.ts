import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as qrcode from 'qrcode';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateQRCodeDto } from './dto/create-qr-code.dto';
import { UpdateQRCodeDto } from './dto/update-qr-code.dto';
import { QRCode, QRCodeDocument } from './schemas/qr-code.schema';

@Injectable()
export class QRCodesService {
  constructor(
    @InjectModel(QRCode.name) private qrCodeModel: Model<QRCodeDocument>,
    private branchesService: BranchesService,
    private companiesService: CompaniesService,
  ) {}

  async generate(createQRCodeDto: CreateQRCodeDto, userId: string): Promise<QRCode> {
    // Get branch and company to build slug-based URL
    const branch = await this.branchesService.findOne(createQRCodeDto.branchId);
    let companySlug: string | undefined;
    let branchSlug: string | undefined;
    
    // Get company slug and check for custom domain
    let company: any = null;
    let customDomain: string | null = null;
    if (branch?.companyId) {
      let companyIdStr: string;
      if (typeof branch.companyId === 'object' && branch.companyId !== null) {
        companyIdStr = (branch.companyId as any)._id?.toString() || (branch.companyId as any).id?.toString() || branch.companyId.toString();
      } else {
        companyIdStr = branch.companyId.toString();
      }
      
      if (companyIdStr && /^[0-9a-fA-F]{24}$/.test(companyIdStr)) {
        try {
          company = await this.companiesService.findOne(companyIdStr);
          companySlug = company?.slug;
          // Check for custom domain
          if (company?.customDomain && company?.domainVerified) {
            customDomain = company.customDomain;
          }
        } catch (error) {
          console.warn('Could not fetch company for QR code URL:', error);
        }
      }
    }
    
    branchSlug = branch?.slug;
    
    // Generate URL - prioritize custom domain, then slug-based, then fallback to branchId
    const baseUrl = process.env.APP_URL || process.env.APP_URL || 'http://localhost:3000';
    let url: string;
    
    if (customDomain) {
      // Use custom domain: https://customDomain.com/[branchSlug]/shop?type=...
      const protocol = 'https://';
      const urlParams = new URLSearchParams();
      if (createQRCodeDto.menuType && createQRCodeDto.menuType !== 'full') {
        urlParams.append('type', createQRCodeDto.menuType);
      }
      if (createQRCodeDto.tableNumber) {
        urlParams.append('table', createQRCodeDto.tableNumber.toString());
      }
      const queryString = urlParams.toString();
      if (branchSlug) {
        url = `${protocol}${customDomain}/${branchSlug}/shop${queryString ? `?${queryString}` : ''}`;
      } else {
        // Fallback to display/menu format with custom domain
        const urlParams = new URLSearchParams({
          branchId: createQRCodeDto.branchId,
          ...(createQRCodeDto.tableNumber && { table: createQRCodeDto.tableNumber.toString() }),
          type: createQRCodeDto.menuType,
        });
        url = `${protocol}${customDomain}/display/menu?${urlParams.toString()}`;
      }
    } else if (companySlug && branchSlug) {
      // Use slug-based URL: /[companySlug]/[branchSlug]/shop?type=...
      const urlParams = new URLSearchParams();
      if (createQRCodeDto.menuType && createQRCodeDto.menuType !== 'full') {
        urlParams.append('type', createQRCodeDto.menuType);
      }
      if (createQRCodeDto.tableNumber) {
        urlParams.append('table', createQRCodeDto.tableNumber.toString());
      }
      const queryString = urlParams.toString();
      url = `${baseUrl}/${companySlug}/${branchSlug}/shop${queryString ? `?${queryString}` : ''}`;
    } else {
      // Fallback to old format with branchId
      const urlParams = new URLSearchParams({
        branchId: createQRCodeDto.branchId,
        ...(createQRCodeDto.tableNumber && { table: createQRCodeDto.tableNumber.toString() }),
        type: createQRCodeDto.menuType,
      });
      url = `${baseUrl}/display/menu?${urlParams.toString()}`;
    }

    // Generate QR code image
    const qrCodeImage = await qrcode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    });

    const qrCodeData: any = {
      branchId: new Types.ObjectId(createQRCodeDto.branchId),
      menuType: createQRCodeDto.menuType,
      url,
      qrCodeImage,
      isActive: true,
      scanCount: 0,
    };

    // Only include tableNumber if it's a valid positive number
    if (createQRCodeDto.tableNumber !== undefined && createQRCodeDto.tableNumber !== null) {
      const tableNum = typeof createQRCodeDto.tableNumber === 'number' 
        ? createQRCodeDto.tableNumber 
        : parseInt(String(createQRCodeDto.tableNumber), 10);
      
      if (!isNaN(tableNum) && tableNum > 0) {
        qrCodeData.tableNumber = tableNum;
      }
    }

    const qrCode = new this.qrCodeModel(qrCodeData);

    return qrCode.save();
  }

  async findAll(branchId?: string, tableNumber?: number): Promise<QRCode[]> {
    const query: any = {};
    
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    
    // Only include tableNumber if it's a valid positive number
    if (tableNumber !== undefined && tableNumber !== null) {
      const tableNum = typeof tableNumber === 'number' 
        ? tableNumber 
        : parseInt(String(tableNumber), 10);
      
      if (!isNaN(tableNum) && tableNum > 0) {
        query.tableNumber = tableNum;
      }
    }

    return this.qrCodeModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<QRCode> {
    return this.qrCodeModel.findById(id).exec();
  }

  async update(id: string, updateQRCodeDto: UpdateQRCodeDto): Promise<QRCode> {
    const qrCode = await this.qrCodeModel.findById(id).exec();
    if (!qrCode) {
      throw new Error('QR code not found');
    }

    const updateData: any = { ...updateQRCodeDto };
    updateData.updatedAt = new Date();

    // If menuType is being updated, regenerate the URL
    if (updateQRCodeDto.menuType && updateQRCodeDto.menuType !== qrCode.menuType) {
      // Get branch and company to build slug-based URL
      const branch = await this.branchesService.findOne(qrCode.branchId.toString());
      let companySlug: string | undefined;
      let branchSlug: string | undefined;
      let customDomain: string | null = null;
      let company: any = null;
      
      // Get company slug and check for custom domain
      if (branch?.companyId) {
        let companyIdStr: string;
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          companyIdStr = (branch.companyId as any)._id?.toString() || (branch.companyId as any).id?.toString() || branch.companyId.toString();
        } else {
          companyIdStr = branch.companyId.toString();
        }
        
        if (companyIdStr && /^[0-9a-fA-F]{24}$/.test(companyIdStr)) {
          try {
            company = await this.companiesService.findOne(companyIdStr);
            companySlug = company?.slug;
            // Check for custom domain
            if (company?.customDomain && company?.domainVerified) {
              customDomain = company.customDomain;
            }
          } catch (error) {
            console.warn('Could not fetch company for QR code URL update:', error);
          }
        }
      }
      
      branchSlug = branch?.slug;
      
      // Generate URL - prioritize custom domain, then slug-based, then fallback to branchId
      const baseUrl = process.env.APP_URL || process.env.APP_URL || 'http://localhost:3000';
      let newUrl: string;
      
      if (customDomain) {
        // Use custom domain: https://customDomain.com/[branchSlug]/shop?type=...
        const protocol = 'https://';
        const urlParams = new URLSearchParams();
        if (updateQRCodeDto.menuType && updateQRCodeDto.menuType !== 'full') {
          urlParams.append('type', updateQRCodeDto.menuType);
        }
        if (qrCode.tableNumber) {
          urlParams.append('table', qrCode.tableNumber.toString());
        }
        const queryString = urlParams.toString();
        if (branchSlug) {
          newUrl = `${protocol}${customDomain}/${branchSlug}/shop${queryString ? `?${queryString}` : ''}`;
        } else {
          // Fallback to display/menu format with custom domain
          const urlParams = new URLSearchParams({
            branchId: qrCode.branchId.toString(),
            ...(qrCode.tableNumber && { table: qrCode.tableNumber.toString() }),
            type: updateQRCodeDto.menuType,
          });
          newUrl = `${protocol}${customDomain}/display/menu?${urlParams.toString()}`;
        }
      } else if (companySlug && branchSlug) {
        // Use slug-based URL: /[companySlug]/[branchSlug]/shop?type=...
        const urlParams = new URLSearchParams();
        if (updateQRCodeDto.menuType && updateQRCodeDto.menuType !== 'full') {
          urlParams.append('type', updateQRCodeDto.menuType);
        }
        if (qrCode.tableNumber) {
          urlParams.append('table', qrCode.tableNumber.toString());
        }
        const queryString = urlParams.toString();
        newUrl = `${baseUrl}/${companySlug}/${branchSlug}/shop${queryString ? `?${queryString}` : ''}`;
      } else {
        // Fallback to old format with branchId
        const urlParams = new URLSearchParams({
          branchId: qrCode.branchId.toString(),
          ...(qrCode.tableNumber && { table: qrCode.tableNumber.toString() }),
          type: updateQRCodeDto.menuType,
        });
        newUrl = `${baseUrl}/display/menu?${urlParams.toString()}`;
      }
      
      // Regenerate QR code image with new URL
      const qrCodeImage = await qrcode.toDataURL(newUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
      });

      updateData.url = newUrl;
      updateData.qrCodeImage = qrCodeImage;
    }

    return this.qrCodeModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.qrCodeModel.findByIdAndDelete(id).exec();
  }

  async trackScan(id: string): Promise<void> {
    await this.qrCodeModel.findByIdAndUpdate(id, {
      $inc: { scanCount: 1 },
      lastScanned: new Date(),
    }).exec();
  }
}

