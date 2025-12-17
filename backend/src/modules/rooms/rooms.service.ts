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

    const room = new this.roomModel({
      ...createRoomDto,
      companyId: branch.companyId,
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
    const rooms = await this.roomModel
      .find(filter)
      .populate('branchId', 'name code')
      .populate('companyId', 'name')
      .populate({
        path: 'currentBookingId',
        select: 'bookingNumber guestName checkInDate checkOutDate status',
      })
      .sort({ floor: 1, roomNumber: 1 })
      .lean()
      .exec();

    return rooms as any;
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
    return this.findAll({ branchId, isActive: true });
  }

  async findAvailable(branchId: string, checkInDate?: Date, checkOutDate?: Date): Promise<Room[]> {
    const query: any = {
      branchId: new Types.ObjectId(branchId),
      status: { $in: ['available', 'reserved'] },
      isActive: true,
    };

    // If dates provided, check for booking conflicts
    if (checkInDate && checkOutDate) {
      const conflictingBookings = await this.roomModel
        .find({
          branchId: new Types.ObjectId(branchId),
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
        query._id = { $nin: occupiedRoomIds };
      }
    }

    return this.roomModel
      .find(query)
      .populate('branchId', 'name code')
      .sort({ floor: 1, roomNumber: 1 })
      .exec();
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
    const rooms = await this.roomModel
      .find({ branchId: new Types.ObjectId(branchId), isActive: true })
      .exec();

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

