import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { BranchesService } from '../branches/branches.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room, RoomDocument } from './schemas/room.schema';
@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name)
    private roomModel: Model<RoomDocument>,
    private branchesService: BranchesService,
    private websocketsGateway: WebsocketsGateway,
  ) {}
  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    // Get branch to extract companyId
    const branch = await this.branchesService.findOne(createRoomDto.branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    // Check if room number already exists in the branch
    const existingRoom = await this.roomModel.findOne({
      branchId: new Types.ObjectId(createRoomDto.branchId),
      roomNumber: createRoomDto.roomNumber,
    });
    if (existingRoom) {
      throw new BadRequestException(
        'Room with this number already exists in this branch',
      );
    }
    // Generate unique QR code ID
    const qrCodeId = GeneratorUtil.generateToken(16);
    // Generate QR code data URL
    const qrCodeData = `room:${createRoomDto.branchId}:${createRoomDto.roomNumber}:${qrCodeId}`;
    // Ensure branchId is converted to ObjectId
    const branchIdObj = Types.ObjectId.isValid(createRoomDto.branchId)
      ? new Types.ObjectId(createRoomDto.branchId)
      : createRoomDto.branchId;
    const companyIdObj = branch.companyId instanceof Types.ObjectId
      ? branch.companyId
      : (Types.ObjectId.isValid(branch.companyId) ? new Types.ObjectId(branch.companyId) : branch.companyId);
    const room = new this.roomModel({
      ...createRoomDto,
      branchId: branchIdObj,
      companyId: companyIdObj,
      qrCode: qrCodeId,
      status: 'available',
      beds: createRoomDto.beds || { single: 0, double: 0, king: 0 },
      amenities: createRoomDto.amenities || [],
      seasonalPricing: createRoomDto.seasonalPricing || [],
      images: createRoomDto.images || [],
      smokingAllowed: createRoomDto.smokingAllowed || false,
    });
    const savedRoom = await room.save();
    // Generate QR code image URL
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData);
      (savedRoom as any).qrCodeUrl = qrCodeUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
    // Emit WebSocket event
    this.websocketsGateway.emitToBranch(
      createRoomDto.branchId,
      'room:created',
      savedRoom,
    );
    return savedRoom;
  }
  async findAll(filter: any = {}): Promise<Room[]> {
    try {
      // Convert branchId and companyId to ObjectId if they exist and are strings
      const processedFilter = { ...filter };
      if (processedFilter.branchId && typeof processedFilter.branchId === 'string') {
        const branchIdStr = processedFilter.branchId.trim();
        if (branchIdStr && Types.ObjectId.isValid(branchIdStr)) {
          processedFilter.branchId = new Types.ObjectId(branchIdStr);
        } else if (branchIdStr) {
          // Invalid branchId format - log warning but don't break the query
          // Return empty array to prevent MongoDB errors
          console.warn(`[RoomsService.findAll] Invalid branch ID format, returning empty array:`, branchIdStr);
          return [];
        } else {
          // Empty string, remove from filter
          delete processedFilter.branchId;
        }
      }
      if (processedFilter.companyId && typeof processedFilter.companyId === 'string') {
        const companyIdStr = processedFilter.companyId.trim();
        if (companyIdStr && Types.ObjectId.isValid(companyIdStr)) {
          processedFilter.companyId = new Types.ObjectId(companyIdStr);
        } else if (companyIdStr) {
          console.warn(`[RoomsService.findAll] Invalid company ID format, returning empty array:`, companyIdStr);
          return [];
        } else {
          delete processedFilter.companyId;
        }
      }
      // Note: We handle both ObjectId and string formats for branchId to support
      // rooms created in the past that might have string branchIds
      // Try querying with ObjectId first
      let rooms = await this.roomModel
        .find(processedFilter)
        .populate('branchId', 'name code')
        .populate('companyId', 'name')
        .populate({
          path: 'currentBookingId',
          select: 'bookingNumber guestName checkInDate checkOutDate status',
        })
        .sort({ floor: 1, roomNumber: 1 })
        .lean()
        .exec();
      // If no rooms found and branchId is ObjectId, try querying with string format
      // This handles cases where rooms were created with branchId as string
      if (rooms.length === 0 && processedFilter.branchId instanceof Types.ObjectId) {
        const branchIdStr = processedFilter.branchId.toString();
        const filterWithString = { ...processedFilter, branchId: branchIdStr };
        rooms = await this.roomModel
          .find(filterWithString)
          .populate('branchId', 'name code')
          .populate('companyId', 'name')
          .populate({
            path: 'currentBookingId',
            select: 'bookingNumber guestName checkInDate checkOutDate status',
          })
          .sort({ floor: 1, roomNumber: 1 })
          .lean()
          .exec();
       
      }
      // Ensure we always return an array, even if empty or null/undefined
      if (!rooms) {
        return [];
      }
      return Array.isArray(rooms) ? rooms : [];
    } catch (error) {
      console.error(`[RoomsService.findAll] Error fetching rooms:`, error);
      console.error(`[RoomsService.findAll] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      // Return empty array on error to prevent breaking the UI
      return [];
    }
  }
  async findOne(id: string): Promise<Room> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid room ID');
    }
    const room = await this.roomModel
      .findById(id)
      .populate('branchId', 'name code address')
      .populate('companyId', 'name')
      .populate({
        path: 'currentBookingId',
        select: 'bookingNumber guestName checkInDate checkOutDate status totalAmount',
        populate: {
          path: 'guestId',
          select: 'firstName lastName email phone',
        },
      });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
  async findByBranch(branchId: string): Promise<Room[]> {
    // Validate branchId format
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID format');
    }
    // Use findAll which now handles both ObjectId and string formats
    return this.findAll({ branchId, isActive: true });
  }
  async findAvailable(branchId: string, checkInDate?: Date, checkOutDate?: Date): Promise<Room[]> {
    // Validate branchId before using it
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException(`Invalid branch ID format: ${branchId}`);
    }
    const branchObjectId = new Types.ObjectId(branchId);
    const branchIdStr = branchId;
    // Build query that can match both ObjectId and string formats
    const baseQuery: any = {
      $or: [
        { branchId: branchObjectId },
        { branchId: branchIdStr }
      ],
      status: { $in: ['available', 'reserved'] },
      isActive: true,
    };
    // If dates provided, check for booking conflicts
    if (checkInDate && checkOutDate) {
      const conflictingBookings = await this.roomModel
        .find({
          $or: [
            { branchId: branchObjectId },
            { branchId: branchIdStr }
          ],
          status: { $in: ['occupied', 'reserved'] },
          isActive: true,
        })
        .populate({
          path: 'currentBookingId',
          match: {
            $or: [
              {
                checkInDate: { $lte: checkOutDate },
                checkOutDate: { $gte: checkInDate },
              },
            ],
            status: { $in: ['confirmed', 'checked_in'] },
          },
        })
        .exec();
      const occupiedRoomIds = conflictingBookings
        .filter((room: any) => room.currentBookingId)
        .map((room: any) => room._id.toString());
      if (occupiedRoomIds.length > 0) {
        baseQuery._id = { $nin: occupiedRoomIds };
      }
    }
    let rooms = await this.roomModel
      .find(baseQuery)
      .populate('branchId', 'name code')
      .sort({ floor: 1, roomNumber: 1 })
      .lean()
      .exec();
    // If no rooms found with ObjectId, try with string only
    if (rooms.length === 0) {
      const stringQuery = { ...baseQuery };
      stringQuery.$or = [{ branchId: branchIdStr }];
      rooms = await this.roomModel
        .find(stringQuery)
        .populate('branchId', 'name code')
        .sort({ floor: 1, roomNumber: 1 })
        .lean()
        .exec();
    }
    return rooms as any;
  }
  async findByQrCode(qrCode: string): Promise<Room> {
    const room = await this.roomModel
      .findOne({ qrCode })
      .populate('branchId', 'name code address')
      .populate('companyId', 'name')
      .populate({
        path: 'currentBookingId',
        select: 'bookingNumber guestName checkInDate checkOutDate status',
      });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid room ID');
    }
    // Check if room number is being updated and if it conflicts
    if (updateRoomDto.roomNumber) {
      const existingRoom = await this.roomModel.findOne({
        _id: { $ne: new Types.ObjectId(id) },
        branchId: updateRoomDto.branchId
          ? new Types.ObjectId(updateRoomDto.branchId)
          : undefined,
        roomNumber: updateRoomDto.roomNumber,
      });
      if (existingRoom) {
        throw new BadRequestException(
          'Room with this number already exists in this branch',
        );
      }
    }
    const room = await this.roomModel
      .findByIdAndUpdate(id, updateRoomDto, { new: true })
      .populate('branchId', 'name code')
      .populate('companyId', 'name');
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    // Emit WebSocket event
    if (room.branchId) {
      const branchId = typeof room.branchId === 'object' && room.branchId
        ? (room.branchId as any)._id?.toString() || room.branchId.toString()
        : room.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'room:updated', room);
    }
    return room;
  }
  async updateStatus(
    id: string,
    updateStatusDto: UpdateRoomStatusDto,
  ): Promise<Room> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid room ID');
    }
    const existingRoom = await this.roomModel.findById(id).exec();
    if (!existingRoom) {
      throw new NotFoundException('Room not found');
    }
    const branchIdForSocket = existingRoom.branchId?.toString() ||
                             (existingRoom.branchId as any)?._id?.toString();
    const updateData: any = {
      status: updateStatusDto.status,
    };
    // Handle status-specific updates
    if (updateStatusDto.status === 'occupied') {
      updateData.checkedInAt = new Date();
    } else if (updateStatusDto.status === 'available') {
      updateData.checkedInAt = null;
      updateData.checkedOutAt = new Date();
      updateData.currentBookingId = null;
    }
    const room = await this.roomModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('branchId', 'name code')
      .populate({
        path: 'currentBookingId',
        select: 'bookingNumber guestName checkInDate checkOutDate status',
      });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    // Emit WebSocket event
    if (branchIdForSocket) {
      this.websocketsGateway.emitToBranch(
        branchIdForSocket,
        'room:status-updated',
        room,
      );
    }
    return room;
  }
  async bulkCreate(
    branchId: string,
    count: number,
    prefix: string = 'R',
    startNumber: number = 1,
  ): Promise<Room[]> {
    const branch = await this.branchesService.findOne(branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    const rooms: Room[] = [];
    const qrCodeId = GeneratorUtil.generateToken(16);
    for (let i = 0; i < count; i++) {
      const roomNumber = `${prefix}${startNumber + i}`;
      // Check if room already exists
      const existingRoom = await this.roomModel.findOne({
        branchId: new Types.ObjectId(branchId),
        roomNumber,
      });
      if (existingRoom) {
        continue; // Skip if room already exists
      }
      const room = new this.roomModel({
        branchId: new Types.ObjectId(branchId),
        companyId: branch.companyId,
        roomNumber,
        roomType: 'double', // Default
        maxOccupancy: 2, // Default
        basePrice: 5000, // Default
        qrCode: `${qrCodeId}-${i}`,
        status: 'available',
        beds: { single: 0, double: 1, king: 0 },
        amenities: [],
        seasonalPricing: [],
        images: [],
        smokingAllowed: false,
        isActive: true,
      });
      rooms.push(await room.save());
    }
    // Emit WebSocket event
    this.websocketsGateway.emitToBranch(
      branchId,
      'rooms:bulk-created',
      { count: rooms.length },
    );
    return rooms;
  }
  async getStats(branchId: string): Promise<any> {
    if (!Types.ObjectId.isValid(branchId)) {
      // Return empty stats if branchId is invalid
      console.warn(`[RoomsService.getStats] Invalid branchId format: ${branchId}`);
      return {
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        maintenance: 0,
        outOfOrder: 0,
        occupancyRate: 0,
      };
    }
    // Try ObjectId format first
    let rooms = await this.roomModel
      .find({ branchId: new Types.ObjectId(branchId), isActive: true })
      .exec();
    // If no rooms found, try string format (for backward compatibility)
    if (rooms.length === 0) {
      rooms = await this.roomModel
        .find({ branchId: branchId, isActive: true })
        .exec();
      }
    const stats = {
      total: rooms.length,
      available: rooms.filter((r) => r.status === 'available').length,
      occupied: rooms.filter((r) => r.status === 'occupied').length,
      reserved: rooms.filter((r) => r.status === 'reserved').length,
      maintenance: rooms.filter((r) => r.status === 'maintenance').length,
      outOfOrder: rooms.filter((r) => r.status === 'out_of_order').length,
      occupancyRate: 0,
    };
    if (stats.total > 0) {
      stats.occupancyRate = Math.round(
        ((stats.occupied + stats.reserved) / stats.total) * 100,
      );
    }
    return stats;
  }
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid room ID');
    }
    const room = await this.roomModel.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    // Check if room has active booking
    if (room.currentBookingId) {
      throw new BadRequestException(
        'Cannot delete room with active booking. Please check out the guest first.',
      );
    }
    const branchId = room.branchId?.toString() ||
                    (room.branchId as any)?._id?.toString();
    await this.roomModel.findByIdAndDelete(id);
    // Emit WebSocket event
    if (branchId) {
      this.websocketsGateway.emitToBranch(branchId, 'room:deleted', { id });
    }
  }
}
