import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as qrcode from 'qrcode';
import { CreateQRCodeDto } from './dto/create-qr-code.dto';
import { UpdateQRCodeDto } from './dto/update-qr-code.dto';
import { QRCode, QRCodeDocument } from './schemas/qr-code.schema';

@Injectable()
export class QRCodesService {
  constructor(
    @InjectModel(QRCode.name) private qrCodeModel: Model<QRCodeDocument>,
  ) {}

  async generate(createQRCodeDto: CreateQRCodeDto, userId: string): Promise<QRCode> {
    // Generate unique URL for the QR code
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const urlParams = new URLSearchParams({
      branchId: createQRCodeDto.branchId,
      ...(createQRCodeDto.tableNumber && { table: createQRCodeDto.tableNumber.toString() }),
      type: createQRCodeDto.menuType,
    });
    const url = `${baseUrl}/display/menu?${urlParams.toString()}`;

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
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const urlParams = new URLSearchParams({
        branchId: qrCode.branchId.toString(),
        ...(qrCode.tableNumber && { table: qrCode.tableNumber.toString() }),
        type: updateQRCodeDto.menuType,
      });
      const newUrl = `${baseUrl}/display/menu?${urlParams.toString()}`;
      
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

