import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { CreateTableDto } from './dto/create-table.dto';
import { ReserveTableDto } from './dto/reserve-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { Table, TableDocument } from './schemas/table.schema';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name)
    private tableModel: Model<TableDocument>,
  ) {}

  async create(createTableDto: CreateTableDto): Promise<Table> {
    // Check if table number already exists in the branch
    const existingTable = await this.tableModel.findOne({
      branchId: new Types.ObjectId(createTableDto.branchId),
      tableNumber: createTableDto.tableNumber,
    });

    if (existingTable) {
      throw new BadRequestException(
        'Table with this number already exists in this branch',
      );
    }

    // Generate unique QR code ID
    const qrCodeId = GeneratorUtil.generateToken(16);

    // Generate QR code data URL (can be used to generate actual QR code image)
    const qrCodeData = `table:${createTableDto.branchId}:${createTableDto.tableNumber}:${qrCodeId}`;

    const table = new this.tableModel({
      ...createTableDto,
      qrCode: qrCodeId,
      status: 'available',
    });

    const savedTable = await table.save();

    // Generate QR code image URL (in production, you'd upload to Cloudinary)
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData);
      // Store qrCodeUrl if needed, or return it separately
      (savedTable as any).qrCodeUrl = qrCodeUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
    }

    return savedTable;
  }

  async findAll(filter: any = {}): Promise<Table[]> {
    return this.tableModel
      .find(filter)
      .populate('branchId', 'name code')
      .populate({
        path: 'currentOrderId',
        select: 'orderNumber total subtotal customer createdAt',
        populate: {
          path: 'customer',
          select: 'firstName lastName phone'
        }
      })
      .populate('occupiedBy', 'firstName lastName')
      .sort({ tableNumber: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Table> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const table = await this.tableModel
      .findById(id)
      .populate('branchId', 'name code')
      .populate('currentOrderId', 'orderNumber total items')
      .populate('occupiedBy', 'firstName lastName');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async findByBranch(branchId: string): Promise<Table[]> {
    return this.tableModel
      .find({ branchId: new Types.ObjectId(branchId) })
      .populate({
        path: 'currentOrderId',
        select: 'orderNumber total subtotal customer createdAt',
        populate: {
          path: 'customer',
          select: 'firstName lastName phone'
        }
      })
      .populate('occupiedBy', 'firstName lastName')
      .sort({ tableNumber: 1 })
      .exec();
  }

  async findAvailable(branchId: string): Promise<Table[]> {
    return this.tableModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'available',
        isActive: true,
      })
      .sort({ tableNumber: 1 })
      .exec();
  }

  async findByQrCode(qrCode: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ qrCode })
      .populate('branchId', 'name code address')
      .populate('currentOrderId', 'orderNumber total items');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async update(id: string, updateTableDto: UpdateTableDto): Promise<Table> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const table = await this.tableModel
      .findByIdAndUpdate(id, updateTableDto, { new: true })
      .populate('branchId', 'name code');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateTableStatusDto,
  ): Promise<Table> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Handle status-specific updates
    if (updateStatusDto.status === 'occupied') {
      updateData.occupiedAt = new Date();
      if (updateStatusDto.orderId) {
        updateData.currentOrderId = new Types.ObjectId(updateStatusDto.orderId);
      }
      if (updateStatusDto.occupiedBy) {
        updateData.occupiedBy = new Types.ObjectId(updateStatusDto.occupiedBy);
      }
    } else if (updateStatusDto.status === 'available') {
      updateData.occupiedAt = null;
      updateData.currentOrderId = null;
      updateData.occupiedBy = null;
    }

    const table = await this.tableModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('branchId', 'name code')
      .populate('currentOrderId', 'orderNumber total');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async reserve(id: string, reserveDto: ReserveTableDto): Promise<Table> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const table = await this.tableModel.findById(id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status !== 'available') {
      throw new BadRequestException('Table is not available for reservation');
    }

    table.status = 'reserved';
    table.reservedFor = new Date(reserveDto.reservedFor);
    table.reservedBy = {
      name: reserveDto.name,
      phone: reserveDto.phone,
      partySize: reserveDto.partySize,
    };

    return table.save();
  }

  async cancelReservation(id: string): Promise<Table> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const table = await this.tableModel.findById(id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status !== 'reserved') {
      throw new BadRequestException('Table is not reserved');
    }

    table.status = 'available';
    table.reservedFor = undefined;
    table.reservedBy = undefined;

    return table.save();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    const table = await this.tableModel.findById(id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status === 'occupied') {
      throw new BadRequestException('Cannot delete an occupied table');
    }

    await this.tableModel.findByIdAndDelete(id);
  }

  async getStats(branchId: string): Promise<any> {
    const tables = await this.tableModel.find({
      branchId: new Types.ObjectId(branchId),
    });

    const stats = {
      total: tables.length,
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
      totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
      occupancyRate: 0,
    };

    if (stats.total > 0) {
      stats.occupancyRate = Math.round((stats.occupied / stats.total) * 100);
    }

    return stats;
  }

  async bulkCreate(
    branchId: string,
    count: number,
    prefix: string = 'T',
  ): Promise<Table[]> {
    const tables: Table[] = [];

    for (let i = 1; i <= count; i++) {
      const tableNumber = `${prefix}-${String(i).padStart(2, '0')}`;
      const qrCodeId = GeneratorUtil.generateToken(16);

      const table = new this.tableModel({
        branchId: new Types.ObjectId(branchId),
        tableNumber,
        qrCode: qrCodeId,
        capacity: 4, // Default capacity
        status: 'available',
      });

      tables.push(await table.save());
    }

    return tables;
  }
}

