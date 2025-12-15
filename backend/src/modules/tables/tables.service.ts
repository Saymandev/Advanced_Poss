import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { POSSettings, POSSettingsDocument } from '../pos/schemas/pos-settings.schema';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
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
    @InjectModel(POSOrder.name)
    private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(POSSettings.name)
    private posSettingsModel: Model<POSSettingsDocument>,
    private websocketsGateway: WebsocketsGateway,
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
    const tables = await this.tableModel
      .find(filter)
      .populate('branchId', 'name code')
      .populate({
        path: 'currentOrderId',
        select: 'orderNumber total subtotal customer createdAt status',
        populate: {
          path: 'customer',
          select: 'firstName lastName phone'
        }
      })
      .populate('occupiedBy', 'firstName lastName')
      .sort({ tableNumber: 1 })
      .lean()
      .exec();

    // Calculate status dynamically based on pending orders (same logic as POS)
    // This ensures Table Management and POS show the same status
    if (tables.length === 0) {
      return tables as any;
    }

    // Extract branchId from filter or from first table
    let branchId: Types.ObjectId | null = null;
    if (filter.branchId) {
      branchId = new Types.ObjectId(filter.branchId);
    } else if (tables.length > 0 && tables[0].branchId) {
      const firstTableBranchId = (tables[0] as any).branchId;
      if (typeof firstTableBranchId === 'object' && firstTableBranchId !== null) {
        branchId = firstTableBranchId._id ? new Types.ObjectId(firstTableBranchId._id) : 
                   new Types.ObjectId(firstTableBranchId.toString());
      } else {
        branchId = new Types.ObjectId(firstTableBranchId);
      }
    }

    // If we have a branchId, check for orders to calculate real-time status
    if (branchId) {
      // Get POS settings to check payment mode
      let posSettings = await this.posSettingsModel.findOne({ branchId: branchId }).exec();
      if (!posSettings) {
        // Default to pay-later if no settings found
        posSettings = { defaultPaymentMode: 'pay-later' } as any;
      }
      const isPayFirstMode = posSettings.defaultPaymentMode === 'pay-first';

      // Get today's orders for this branch
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pendingOrders = await this.posOrderModel.find({
        branchId: branchId,
        createdAt: { $gte: today, $lt: tomorrow },
        status: 'pending',
        orderType: 'dine-in',
        tableId: { $exists: true, $ne: null }, // Only get orders with tableId
      })
      .select('tableId status')
      .lean()
      .exec();

      // ALWAYS check for paid orders with tableId
      // If there's a paid order with tableId, the customer paid and is using the table
      // This works regardless of payment mode setting (handles frontend toggle vs backend setting mismatch)
      const paidOrders = await this.posOrderModel.find({
        branchId: branchId,
        createdAt: { $gte: today, $lt: tomorrow },
        status: 'paid',
        orderType: 'dine-in',
        tableId: { $exists: true, $ne: null }, // Only get orders with tableId
      })
      .select('tableId status')
      .lean()
      .exec();

      // Group orders by table
      const occupiedTableIds = new Set<string>();
      pendingOrders.forEach(order => {
        if (order.tableId) {
          const tableIdStr = typeof order.tableId === 'object' && order.tableId 
            ? (order.tableId._id || order.tableId).toString() 
            : String(order.tableId || '');
          if (tableIdStr) occupiedTableIds.add(tableIdStr);
        }
      });
      
      // ALWAYS mark tables with paid orders as occupied (regardless of payment mode setting)
      // If there's a paid order with tableId, the customer is using the table
      paidOrders.forEach(order => {
        if (order.tableId) {
          const tableIdStr = typeof order.tableId === 'object' && order.tableId 
            ? (order.tableId._id || order.tableId).toString() 
            : String(order.tableId || '');
          if (tableIdStr) occupiedTableIds.add(tableIdStr);
        }
      });
      
      // Log for debugging
      if (paidOrders.length > 0) {
        console.log(`🔍 [TablesService.findAll] Found ${paidOrders.length} paid orders with tableId (payment mode setting: ${posSettings.defaultPaymentMode}). Marking tables as occupied.`);
      }

      // Update table status based on orders
      return tables.map((table: any) => {
        const tableId = table._id?.toString() || table.id;
        const hasOrder = occupiedTableIds.has(tableId);
        
        // Calculate status: occupied if has order (pending or paid)
        // Paid orders with tableId always occupy tables (customer paid and is using the table)
        // This works regardless of payment mode setting (handles frontend toggle vs backend setting mismatch)
        let calculatedStatus = table.status;
        if (hasOrder) {
          calculatedStatus = 'occupied';
        } else if (table.status === 'occupied') {
          // Table was marked as occupied but has no orders - make it available
          // (This handles cases where orders were completed/cancelled but status wasn't updated)
          calculatedStatus = 'available';
        }
        // Keep 'reserved' and 'cleaning' statuses as-is
        
        return {
          ...table,
          status: calculatedStatus,
        };
      });
    }

    // If no branchId, return tables as-is (shouldn't happen in normal flow)
    return tables as any;
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
    // Use findAll with branchId filter to get dynamic status calculation
    return this.findAll({ branchId });
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

    // Get the table first to extract branchId before population
    const existingTable = await this.tableModel.findById(id).exec();
    if (!existingTable) {
      throw new NotFoundException('Table not found');
    }

    // Store branchId before population
    const branchIdForSocket = existingTable.branchId?.toString() || 
                               (existingTable.branchId as any)?._id?.toString();

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
      
      // When releasing a table, we need to:
      // 1. Cancel pending orders (they're not paid yet)
      // 2. Clear tableId from paid orders (they're paid but table is being released)
      // This ensures the table becomes truly available and won't be recalculated as occupied
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Cancel all pending orders for this table
        const pendingOrders = await this.posOrderModel.find({
          tableId: new Types.ObjectId(id),
          createdAt: { $gte: today, $lt: tomorrow },
          status: 'pending',
          orderType: 'dine-in',
        }).exec();
        
        if (pendingOrders.length > 0) {
          await this.posOrderModel.updateMany(
            {
              _id: { $in: pendingOrders.map(o => o._id) },
            },
            {
              $set: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: 'Table released - orders cancelled automatically',
              },
            }
          ).exec();
          
          console.log(`✅ Cancelled ${pendingOrders.length} pending order(s) for table ${id} when releasing`);
        }
        
        // Clear tableId from paid orders (don't cancel them, just remove table association)
        // IMPORTANT: Store tableNumber in orders BEFORE clearing tableId so it remains in history/receipts
        const paidOrders = await this.posOrderModel.find({
          tableId: new Types.ObjectId(id),
          createdAt: { $gte: today, $lt: tomorrow },
          status: 'paid',
          orderType: 'dine-in',
        }).exec();
        
        if (paidOrders.length > 0) {
          // Get table number before clearing tableId
          const table = await this.tableModel.findById(id).exec();
          const tableNumber = (table as any)?.tableNumber || (table as any)?.number || '';
          
          // Store tableNumber in orders, then clear tableId
          await this.posOrderModel.updateMany(
            {
              _id: { $in: paidOrders.map(o => o._id) },
            },
            {
              $set: { tableNumber: tableNumber }, // Store table number for history/receipts
              $unset: { tableId: '' }, // Clear tableId to release table
            }
          ).exec();
          
          console.log(`✅ Stored tableNumber "${tableNumber}" and cleared tableId from ${paidOrders.length} paid order(s) for table ${id} when releasing`);
        }
      } catch (orderCancelError) {
        // Log error but don't fail table release
        console.error('Failed to process orders when releasing table:', orderCancelError);
      }
    }

    const table = await this.tableModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('branchId', 'name code')
      .populate('currentOrderId', 'orderNumber total');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Notify via WebSocket: table status changed
    try {
      if (branchIdForSocket) {
        const tableObj = table.toObject ? table.toObject() : table;
        // Ensure id field exists for socket event
        if (!tableObj.id && tableObj._id) {
          tableObj.id = tableObj._id.toString();
        }
        
        console.log(`📢 Emitting table:status-changed for table ${tableObj.id || tableObj._id} in branch ${branchIdForSocket}, status: ${tableObj.status}`);
        
        this.websocketsGateway.notifyTableStatusChanged(
          branchIdForSocket,
          tableObj,
        );
      } else {
        console.warn('⚠️ Cannot emit table status change: branchId not found', { 
          tableId: table._id || table.id 
        });
      }
    } catch (wsError) {
      console.error('❌ Failed to emit WebSocket event:', wsError);
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
    // Use findAll to get tables with dynamically calculated status
    const tables = await this.findAll({ branchId });

    const stats = {
      total: tables.length,
      available: tables.filter((t: any) => t.status === 'available').length,
      occupied: tables.filter((t: any) => t.status === 'occupied').length,
      reserved: tables.filter((t: any) => t.status === 'reserved').length,
      cleaning: tables.filter((t: any) => t.status === 'cleaning').length,
      totalCapacity: tables.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0),
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