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
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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

    const qrCode = new this.qrCodeModel({
      branchId: new Types.ObjectId(createQRCodeDto.branchId),
      tableNumber: createQRCodeDto.tableNumber,
      menuType: createQRCodeDto.menuType,
      url,
      qrCodeImage,
      isActive: true,
      scanCount: 0,
    });

    return qrCode.save();
  }

  async findAll(branchId?: string, tableNumber?: number): Promise<QRCode[]> {
    const query: any = {};
    
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    
    if (tableNumber !== undefined) {
      query.tableNumber = tableNumber;
    }

    return this.qrCodeModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<QRCode> {
    return this.qrCodeModel.findById(id).exec();
  }

  async update(id: string, updateQRCodeDto: UpdateQRCodeDto): Promise<QRCode> {
    const updateData: any = { ...updateQRCodeDto };
    updateData.updatedAt = new Date();

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

