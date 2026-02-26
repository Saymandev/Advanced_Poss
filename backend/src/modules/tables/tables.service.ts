import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { NotificationsService } from '../notifications/notifications.service';
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
    private notificationsService: NotificationsService,
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
        // Marking tables as occupied
      }

      // Update table status based on orders and reservations
      const now = new Date();
      return tables.map((table: any) => {
        const tableId = table._id?.toString() || table.id;
        const hasOrder = occupiedTableIds.has(tableId);

        // Calculate status: 
        // 1. occupied if has order (pending or paid)
        // 2. reserved if currently within a reservation window
        // 3. available otherwise
        let calculatedStatus = table.status;
        
        if (hasOrder) {
          calculatedStatus = 'occupied';
        } else {
          // Check for active reservation
          const isReservedNow = table.reservedFor && 
                               new Date(table.reservedFor) <= now && 
                               table.reservedUntil && 
                               new Date(table.reservedUntil) > now;
          
          if (isReservedNow) {
            calculatedStatus = 'reserved';
          } else if (table.status === 'occupied' || table.status === 'reserved') {
            // Table was marked as occupied/reserved but has no orders or active reservation - make it available
            calculatedStatus = 'available';
          }
        }

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

          // Error cancelling orders for table when releasing
        }

        // Clear tableId from paid orders (don't cancel them, just remove table association)
        // IMPORTANT: Store tableNumber in orders BEFORE clearing tableId so it remains in history/receipts
        const tablePaidOrders = await this.posOrderModel.find({
          tableId: new Types.ObjectId(id),
          createdAt: { $gte: today, $lt: tomorrow },
          status: 'paid',
          orderType: 'dine-in',
        }).exec();

        if (tablePaidOrders.length > 0) {
          // Get table number before clearing tableId
          const table = await this.tableModel.findById(id).exec();
          const tableNumber = (table as any)?.tableNumber || (table as any)?.number || '';

          // Store tableNumber in orders, then clear tableId
          await this.posOrderModel.updateMany(
            {
              _id: { $in: tablePaidOrders.map(o => o._id) },
            },
            {
              $set: { tableNumber: tableNumber }, // Store table number for history/receipts
              $unset: { tableId: '' }, // Clear tableId to release table
            }
          ).exec();

          // Error updating orders for table when releasing
        }
      } catch (orderCancelError) {
        // Log error but don't fail table release
        console.error('Failed to process orders when releasing table:', orderCancelError);
      }
    }

    const table = await this.tableModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('branchId', 'name code companyId')
      .populate('currentOrderId', 'orderNumber total');

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Persistent Notification
    if (branchIdForSocket && (table.branchId as any)?.companyId) {
      await this.notificationsService.create({
        companyId: (table.branchId as any).companyId.toString(),
        branchId: branchIdForSocket,
        roles: ['manager', 'waiter'],
        type: 'system',
        title: 'Table Status Changed',
        message: `Table ${table.tableNumber} is now ${updateStatusDto.status}`,
        metadata: { tableId: id, status: updateStatusDto.status },
      });
    }

    // Notify via WebSocket: table status changed
    try {
      if (branchIdForSocket) {
        const tableObj = table.toObject ? table.toObject() : table;
        // Ensure id field exists for socket event
        if (!tableObj.id && tableObj._id) {
          tableObj.id = (tableObj._id as any).toString();
        }

        this.websocketsGateway.notifyTableStatusChanged(
          branchIdForSocket,
          tableObj,
        );
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

    if (table.status === 'occupied') {
      throw new BadRequestException('Table is currently occupied and cannot be reserved');
    }

    const startTime = new Date(reserveDto.reservedFor);
    const endTime = new Date(reserveDto.reservedUntil);

    // Validate time window
    if (endTime <= startTime) {
      throw new BadRequestException('Reservation end time must be after start time');
    }
    const minDuration = 15 * 60 * 1000; // 15 minutes minimum
    if (endTime.getTime() - startTime.getTime() < minDuration) {
      throw new BadRequestException('Reservation must be at least 15 minutes long');
    }

    // Conflict detection: reject if another reservation overlaps the requested window
    // Overlap condition: existing.start < newEnd AND existing.end > newStart
    const conflictingReservation = await this.tableModel.findOne({
      _id: new Types.ObjectId(id),
      status: 'reserved',
      reservedFor: { $lt: endTime },     // existing start < new end
      reservedUntil: { $gt: startTime }, // existing end > new start
    });

    if (conflictingReservation) {
      const existingStart = conflictingReservation.reservedFor?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const existingEnd = (conflictingReservation as any).reservedUntil?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      throw new BadRequestException(
        `Table already has an overlapping reservation from ${existingStart} to ${existingEnd}. Please choose a different time.`
      );
    }

    table.status = 'reserved';
    table.reservedFor = startTime;
    (table as any).reservedUntil = endTime;
    (table as any).reservationNotes = reserveDto.notes || undefined;
    (table as any).preOrderItems = reserveDto.preOrderItems || [];
    table.reservedBy = {
      name: reserveDto.name,
      phone: reserveDto.phone,
      partySize: reserveDto.partySize,
      ...(reserveDto.email ? { email: reserveDto.email } : {}),
      ...(reserveDto.customerId ? { customerId: new Types.ObjectId(reserveDto.customerId) } : {}),
    };

    const saved = await table.save();

    // Notify via WebSocket
    try {
      const branchId = table.branchId?.toString();
      if (branchId) {
        const tableObj = (saved as any).toObject ? (saved as any).toObject() : saved;
        if (!tableObj.id && tableObj._id) tableObj.id = tableObj._id.toString();
        this.websocketsGateway.notifyTableStatusChanged(branchId, tableObj);
      }
    } catch (wsError) {
      console.error('Failed to emit reservation WebSocket event:', wsError);
    }

    // Persistent Notification
    const branchId = table.branchId?.toString();
    if (branchId) {
      // Get companyId from branch population (table is already populated in some flows or we can fetch it)
      const tableWithBranch = await this.tableModel.findById(id).populate('branchId', 'companyId').exec();
      const companyId = (tableWithBranch?.branchId as any)?.companyId;

      if (companyId) {
        await this.notificationsService.create({
          companyId: companyId.toString(),
          branchId,
          roles: ['manager', 'waiter'],
          type: 'system',
          title: 'Table Reserved',
          message: `Table ${table.tableNumber} reserved for ${reserveDto.name} at ${startTime.toLocaleTimeString()}`,
          metadata: { tableId: id, reservation: reserveDto },
        });
      }

      // Targeted real-time notification
      this.websocketsGateway.notifyTableReserved(branchId, saved, reserveDto);
    }

    return saved;
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
    (table as any).reservedUntil = undefined;
    (table as any).reservationNotes = undefined;
    (table as any).preOrderItems = [];
    table.reservedBy = undefined;

    const saved = await table.save();

    // Notify via WebSocket
    try {
      const branchId = table.branchId?.toString();
      if (branchId) {
        const tableObj = (saved as any).toObject ? (saved as any).toObject() : saved;
        if (!tableObj.id && tableObj._id) tableObj.id = tableObj._id.toString();
        this.websocketsGateway.notifyTableStatusChanged(branchId, tableObj);
      }
    } catch (wsError) {
      console.error('Failed to emit cancellation WebSocket event:', wsError);
    }

    // Persistent Notification
    const branchId = table.branchId?.toString();
    if (branchId) {
      const tableWithBranch = await this.tableModel.findById(id).populate('branchId', 'companyId').exec();
      const companyId = (tableWithBranch?.branchId as any)?.companyId;

      if (companyId) {
        await this.notificationsService.create({
          companyId: companyId.toString(),
          branchId,
          roles: ['manager', 'waiter'],
          type: 'system',
          title: 'Reservation Cancelled',
          message: `Reservation for Table ${table.tableNumber} has been cancelled`,
          metadata: { tableId: id },
        });
      }
    }

    return saved;
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

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTableReservations() {
    const now = new Date();
    
    // 1. Find tables that should be 'reserved' but are 'available'
    const pendingReservations = await this.tableModel.find({
      status: 'available',
      reservedFor: { $lte: now },
      reservedUntil: { $gt: now },
    }).exec();

    for (const table of pendingReservations) {
      table.status = 'reserved';
      await table.save();
      this.emitTableStatusChange(table);
    }

    // 2. Find tables that are 'reserved' but the window has expired
    const expiredReservations = await this.tableModel.find({
      status: 'reserved',
      reservedUntil: { $lte: now },
    }).exec();

    for (const table of expiredReservations) {
      table.status = 'available';
      table.reservedFor = undefined;
      (table as any).reservedUntil = undefined;
      (table as any).reservationNotes = undefined;
      (table as any).preOrderItems = [];
      table.reservedBy = undefined;
      await table.save();
      this.emitTableStatusChange(table);
    }
  }

  private emitTableStatusChange(table: TableDocument) {
    try {
      const branchId = table.branchId?.toString();
      if (branchId) {
        const tableObj = table.toObject ? table.toObject() : table;
        if (!tableObj.id && tableObj._id) {
          tableObj.id = (tableObj._id as any).toString();
        }
        this.websocketsGateway.notifyTableStatusChanged(branchId, tableObj);
      }
    } catch (error) {
      console.error('Failed to emit table status change via cron:', error);
    }
  }
}