import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BranchesService } from '../branches/branches.service';
import { CustomersService } from '../customers/customers.service';
import { RoomsService } from '../rooms/rooms.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingDocument } from './schemas/booking.schema';
@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    private roomsService: RoomsService,
    private branchesService: BranchesService,
    private customersService: CustomersService,
    private websocketsGateway: WebsocketsGateway,
  ) {}
  private async generateBookingNumber(branchId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    // Count bookings today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    const todayBookingsCount = await this.bookingModel.countDocuments({
      branchId: new Types.ObjectId(branchId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    const sequence = String(todayBookingsCount + 1).padStart(4, '0');
    return `HTL-${dateStr}-${sequence}`;
  }
  private calculateNumberOfNights(checkInDate: Date, checkOutDate: Date): number {
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }
  private calculateBookingAmounts(
    roomRate: number,
    numberOfNights: number,
    additionalCharges: { type: string; description: string; amount: number }[] = [],
    discount: number = 0,
    taxRate: number = 0,
    serviceChargeRate: number = 0,
  ): {
    totalRoomCharges: number;
    totalAdditionalCharges: number;
    discount: number;
    tax: number;
    serviceCharge: number;
    totalAmount: number;
  } {
    const totalRoomCharges = roomRate * numberOfNights;
    const totalAdditionalCharges = additionalCharges.reduce(
      (sum, charge) => sum + charge.amount,
      0,
    );
    const subtotal = totalRoomCharges + totalAdditionalCharges;
    const discountAmount = discount;
    const afterDiscount = subtotal - discountAmount;
    const tax = (afterDiscount * taxRate) / 100;
    const serviceCharge = (afterDiscount * serviceChargeRate) / 100;
    const totalAmount = afterDiscount + tax + serviceCharge;
    return {
      totalRoomCharges,
      totalAdditionalCharges,
      discount: discountAmount,
      tax,
      serviceCharge,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
    };
  }
  /**
   * Apply an additional charge (e.g. room service order) to an existing booking.
   * This keeps room rate, discount, tax and service charge amounts as-is and
   * recalculates the total and balance.
   */
  async applyAdditionalCharge(
    bookingId: string,
    amount: number,
    type: string = 'room_service',
    description: string = 'Room service charges',
    alreadyPaid: boolean = false,
  ): Promise<Booking> {
    if (!amount || amount <= 0) {
      return this.findOne(bookingId);
    }
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const existingCharges = booking.additionalCharges || [];
    const updatedCharges = [
      ...existingCharges,
      {
        type,
        description,
        amount,
      },
    ];
    const totalRoomCharges = booking.totalRoomCharges || 0;
    const existingExtraTotal = existingCharges.reduce(
      (sum, charge: any) => sum + (charge.amount || 0),
      0,
    );
    const newExtraTotal = existingExtraTotal + amount;
    const discount = booking.discount || 0;
    const tax = booking.tax || 0;
    const serviceCharge = booking.serviceCharge || 0;
    const subtotal = totalRoomCharges + newExtraTotal;
    const afterDiscount = subtotal - discount;
    const newTotalAmount = afterDiscount + tax + serviceCharge;
    // If the charge is already paid (e.g. Room Service via POS), treat it as
    // both an increase in total and in deposit so the balance does not change.
    let depositAmount = booking.depositAmount || 0;
    if (alreadyPaid) {
      depositAmount += amount;
    }
    const balanceAmount = newTotalAmount - depositAmount;
    let paymentStatus = booking.paymentStatus || 'pending';
    if (balanceAmount <= 0) {
      paymentStatus = 'paid';
    } else if (depositAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'pending';
    }
    booking.additionalCharges = updatedCharges as any;
    booking.totalAmount = Math.round(newTotalAmount * 100) / 100;
    booking.depositAmount = depositAmount;
    booking.balanceAmount = balanceAmount;
    booking.paymentStatus = paymentStatus as any;
    const saved = await booking.save();
    // Emit WebSocket event for real-time updates
    if (booking.branchId) {
      const branchId = typeof booking.branchId === 'object' && booking.branchId
        ? (booking.branchId as any)._id?.toString() || booking.branchId.toString()
        : booking.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'booking:updated', saved);
      }
    return saved as any;
  }
  async create(createBookingDto: CreateBookingDto, userId?: string): Promise<Booking> {
    // Validate dates
    const checkInDate = new Date(createBookingDto.checkInDate);
    const checkOutDate = new Date(createBookingDto.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }
    // Get branch to extract companyId
    const branch = await this.branchesService.findOne(createBookingDto.branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    // Get room
    const room = await this.roomsService.findOne(createBookingDto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    // Check if room is available for the dates
    const isAvailable = await this.checkRoomAvailability(
      createBookingDto.roomId,
      checkInDate,
      checkOutDate,
    );
    if (!isAvailable) {
      throw new BadRequestException(
        'Room is not available for the selected dates',
      );
    }
    // Create or find customer
    let customerId: Types.ObjectId | undefined;
    if (createBookingDto.guestId) {
      customerId = new Types.ObjectId(createBookingDto.guestId);
    } else if (createBookingDto.guestEmail || createBookingDto.guestPhone) {
      try {
        // Try to find existing customer
        const companyIdStr = (branch as any).companyId?.toString() || '';
        let existingCustomer = null;
        if (createBookingDto.guestEmail) {
          existingCustomer = await this.customersService.findByEmail(
            companyIdStr,
            createBookingDto.guestEmail,
          );
        }
        if (!existingCustomer && createBookingDto.guestPhone) {
          existingCustomer = await this.customersService.findByPhone(
            companyIdStr,
            createBookingDto.guestPhone,
          );
        }
        if (existingCustomer) {
          customerId = new Types.ObjectId(existingCustomer.id || (existingCustomer as any)._id);
        } else {
          // Create new customer
          // Split guestName into firstName and lastName
          // If only one word is provided, use it as firstName and set lastName to a default value
          const trimmedName = (createBookingDto.guestName || '').trim();
          if (!trimmedName) {
            throw new BadRequestException('Guest name is required');
          }
          const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
          const firstName = (nameParts[0] || trimmedName || 'Guest').trim();
          // Ensure lastName is never empty - use firstName if only one word, or join remaining parts
          let lastName = nameParts.length > 1 
            ? nameParts.slice(1).join(' ').trim() 
            : firstName; // Use firstName as lastName if only one word provided
          // Final safety check - ensure lastName is never empty or just whitespace
          if (!lastName || lastName.trim().length === 0) {
            lastName = firstName;
          }
          const newCustomer = await this.customersService.create({
            companyId: companyIdStr,
            branchId: createBookingDto.branchId,
            firstName: firstName,
            lastName: lastName,
            email: createBookingDto.guestEmail,
            phone: createBookingDto.guestPhone,
          });
          customerId = new Types.ObjectId((newCustomer as any)._id?.toString() || (newCustomer as any).id);
        }
      } catch (error) {
        // If customer creation fails, continue without customerId
        console.error('Error creating/finding customer:', error);
      }
    }
    // Calculate amounts
    const numberOfNights = this.calculateNumberOfNights(checkInDate, checkOutDate);
    const amounts = this.calculateBookingAmounts(
      createBookingDto.roomRate,
      numberOfNights,
      createBookingDto.additionalCharges || [],
      createBookingDto.discount || 0,
      createBookingDto.taxRate || 0,
      createBookingDto.serviceChargeRate || 0,
    );
    // Generate booking number
    const bookingNumber = await this.generateBookingNumber(createBookingDto.branchId);
    // Calculate balance
    const depositAmount = createBookingDto.depositAmount || 0;
    const balanceAmount = amounts.totalAmount - depositAmount;
    // Determine payment status
    let paymentStatus = createBookingDto.paymentStatus || 'pending';
    if (depositAmount >= amounts.totalAmount) {
      paymentStatus = 'paid';
    } else if (depositAmount > 0) {
      paymentStatus = 'partial';
    }
    // Create booking
    const booking = new this.bookingModel({
      bookingNumber,
      companyId: (branch as any).companyId,
      branchId: new Types.ObjectId(createBookingDto.branchId),
      guestId: customerId,
      guestName: createBookingDto.guestName,
      guestEmail: createBookingDto.guestEmail,
      guestPhone: createBookingDto.guestPhone,
      guestIdNumber: createBookingDto.guestIdNumber,
      numberOfGuests: createBookingDto.numberOfGuests,
      roomId: new Types.ObjectId(createBookingDto.roomId),
      roomNumber: room.roomNumber,
      checkInDate,
      checkOutDate,
      numberOfNights,
      roomRate: createBookingDto.roomRate,
      totalRoomCharges: amounts.totalRoomCharges,
      additionalCharges: createBookingDto.additionalCharges || [],
      discount: amounts.discount,
      tax: amounts.tax,
      serviceCharge: amounts.serviceCharge,
      totalAmount: amounts.totalAmount,
      paymentStatus,
      paymentMethod: createBookingDto.paymentMethod,
      depositAmount,
      balanceAmount,
      status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
      specialRequests: createBookingDto.specialRequests,
      arrivalTime: createBookingDto.arrivalTime,
      lateCheckout: createBookingDto.lateCheckout || false,
      notes: createBookingDto.notes,
    });
    const savedBooking = await booking.save();
    // Update room status
    await this.roomsService.update(createBookingDto.roomId, {
      status: 'reserved',
      currentBookingId: (savedBooking as any)._id?.toString() || savedBooking._id.toString(),
    } as any);
    // Emit WebSocket event
    this.websocketsGateway.emitToBranch(
      createBookingDto.branchId,
      'booking:created',
      savedBooking,
    );
    return savedBooking;
  }
  async findAll(filter: any = {}): Promise<Booking[]> {
    const normalizedFilter: any = { ...filter };
    // Normalize branchId to ObjectId so queries like { branchId: '...' } work
    if (normalizedFilter.branchId) {
      try {
        const branchIdValue =
          typeof normalizedFilter.branchId === 'object' &&
          normalizedFilter.branchId._id
            ? normalizedFilter.branchId._id.toString()
            : String(normalizedFilter.branchId);
        if (Types.ObjectId.isValid(branchIdValue)) {
          normalizedFilter.branchId = new Types.ObjectId(branchIdValue);
        }
      } catch {
        // If normalization fails, fall back to original value
      }
    }
    const bookings = await this.bookingModel
      .find(normalizedFilter)
      .populate('branchId', 'name code')
      .populate('companyId', 'name')
      .populate('roomId', 'roomNumber roomType floor')
      .populate('guestId', 'firstName lastName email phone')
      .populate('checkedInBy', 'firstName lastName')
      .populate('checkedOutBy', 'firstName lastName')
      .sort({ checkInDate: 1, createdAt: -1 })
      .lean()
      .exec();
    return bookings as any;
  }
  async findOne(id: string): Promise<Booking> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid booking ID');
    }
    const booking = await this.bookingModel
      .findById(id)
      .populate('branchId', 'name code address')
      .populate('companyId', 'name')
      .populate('roomId', 'roomNumber roomType floor amenities basePrice')
      .populate('guestId', 'firstName lastName email phone')
      .populate('checkedInBy', 'firstName lastName')
      .populate('checkedOutBy', 'firstName lastName');
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }
  async findByBranch(branchId: string): Promise<Booking[]> {
    return this.findAll({ branchId, status: { $ne: 'cancelled' } });
  }
  async checkRoomAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const conflictingBookings = await this.bookingModel.find({
      roomId: new Types.ObjectId(roomId),
      status: { $in: ['pending', 'confirmed', 'checked_in'] },
      $or: [
        {
          checkInDate: { $lte: checkOutDate },
          checkOutDate: { $gte: checkInDate },
        },
      ],
      ...(excludeBookingId && { _id: { $ne: new Types.ObjectId(excludeBookingId) } }),
    });
    return conflictingBookings.length === 0;
  }
  async checkIn(id: string, checkInDto: CheckInDto, userId?: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status === 'checked_in') {
      throw new BadRequestException('Booking is already checked in');
    }
    if (booking.status === 'checked_out') {
      throw new BadRequestException('Booking is already checked out');
    }
    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot check in a cancelled booking');
    }
    // Update booking
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: 'checked_in',
          checkedInAt: new Date(),
          checkedInBy: userId ? new Types.ObjectId(userId) : undefined,
          notes: checkInDto.notes
            ? `${booking.notes || ''}\n${checkInDto.notes}`.trim()
            : booking.notes,
        },
        { new: true },
      )
      .populate('roomId', 'roomNumber roomType')
      .populate('guestId', 'firstName lastName email phone');
    // Update room status
    const rawRoomId = booking.roomId as any;
    const roomIdStr =
      typeof rawRoomId === 'string'
        ? rawRoomId
        : rawRoomId?._id?.toString?.() || rawRoomId?.toString?.();
    if (roomIdStr && Types.ObjectId.isValid(roomIdStr)) {
      await this.roomsService.updateStatus(roomIdStr, { status: 'occupied' } as any);
    } else {
      // Log but don't fail check-in if room reference is malformed
      console.error('[BookingsService.checkIn] Invalid room ID when updating status', {
        bookingId: (booking as any)._id?.toString?.() || id,
        roomId: booking.roomId,
      });
    }
    // Emit WebSocket event
    if (booking.branchId) {
      const branchId = typeof booking.branchId === 'object' && booking.branchId
        ? (booking.branchId as any)._id?.toString() || booking.branchId.toString()
        : booking.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'booking:checked-in', updatedBooking);
    }
    return updatedBooking;
  }
  async checkOut(id: string, checkOutDto: CheckOutDto, userId?: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== 'checked_in') {
      throw new BadRequestException('Booking must be checked in before checkout');
    }
    // Guard: prevent checkout while there is an outstanding balance
    const hasOutstandingBalance =
      (booking.balanceAmount ?? booking.totalAmount - (booking.depositAmount || 0)) > 0;
    if (hasOutstandingBalance) {
      throw new BadRequestException(
        'Cannot check out while there is an outstanding balance. Please settle payment first.',
      );
    }
    // Calculate final amount if additional charges
    let finalAmount = booking.totalAmount;
    if (checkOutDto.additionalCharges && checkOutDto.additionalCharges > 0) {
      finalAmount += checkOutDto.additionalCharges;
      booking.additionalCharges = [
        ...(booking.additionalCharges || []),
        {
          type: 'other',
          description: 'Additional charges at checkout',
          amount: checkOutDto.additionalCharges,
        },
      ];
    }
    // Update booking
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: 'checked_out',
          checkedOutAt: new Date(),
          checkedOutBy: userId ? new Types.ObjectId(userId) : undefined,
          totalAmount: finalAmount,
          balanceAmount: finalAmount - (booking.depositAmount || 0),
          notes: checkOutDto.notes
            ? `${booking.notes || ''}\n${checkOutDto.notes}`.trim()
            : booking.notes,
        },
        { new: true },
      )
      .populate('roomId', 'roomNumber roomType')
      .populate('guestId', 'firstName lastName email phone');
    // Update room status & clear current booking
    const rawRoomId = booking.roomId as any;
    const roomIdStr =
      typeof rawRoomId === 'string'
        ? rawRoomId
        : rawRoomId?._id?.toString?.() || rawRoomId?.toString?.();
    if (roomIdStr && Types.ObjectId.isValid(roomIdStr)) {
      await this.roomsService.updateStatus(roomIdStr, { status: 'available' } as any);
      await this.roomsService.update(roomIdStr, {
        currentBookingId: null,
        checkedOutAt: new Date(),
      } as any);
    } else {
      console.error('[BookingsService.checkOut] Invalid room ID when updating status', {
        bookingId: (booking as any)._id?.toString?.() || id,
        roomId: booking.roomId,
      });
    }
    // Emit WebSocket event
    if (booking.branchId) {
      const branchId = typeof booking.branchId === 'object' && booking.branchId
        ? (booking.branchId as any)._id?.toString() || booking.branchId.toString()
        : booking.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'booking:checked-out', updatedBooking);
    }
    return updatedBooking;
  }
  async cancel(id: string, reason?: string, refundAmount?: number): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status === 'checked_out') {
      throw new BadRequestException('Cannot cancel a checked-out booking');
    }
    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }
    // Update booking
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason,
          refundAmount: refundAmount || 0,
          paymentStatus: refundAmount && refundAmount > 0 ? 'refunded' : booking.paymentStatus,
        },
        { new: true },
      )
      .populate('roomId', 'roomNumber roomType')
      .populate('guestId', 'firstName lastName email phone');
    // Update room status if it was reserved/occupied
    if (booking.status === 'reserved' || booking.status === 'checked_in') {
      const rawRoomId = booking.roomId as any;
      const roomIdStr =
        typeof rawRoomId === 'string'
          ? rawRoomId
          : rawRoomId?._id?.toString?.() || rawRoomId?.toString?.();
      if (roomIdStr && Types.ObjectId.isValid(roomIdStr)) {
        await this.roomsService.updateStatus(roomIdStr, { status: 'available' } as any);
        await this.roomsService.update(roomIdStr, {
          currentBookingId: null,
        } as any);
      } else {
        console.error('[BookingsService.cancel] Invalid room ID when updating status', {
          bookingId: (booking as any)._id?.toString?.() || id,
          roomId: booking.roomId,
        });
      }
    }
    // Emit WebSocket event
    if (booking.branchId) {
      const branchId = typeof booking.branchId === 'object' && booking.branchId
        ? (booking.branchId as any)._id?.toString() || booking.branchId.toString()
        : booking.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'booking:cancelled', updatedBooking);
    }
    return updatedBooking;
  }
  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status === 'checked_out' || booking.status === 'cancelled') {
      throw new BadRequestException('Cannot update a checked-out or cancelled booking');
    }
    // If dates are being updated, check availability
    if (updateBookingDto.checkInDate || updateBookingDto.checkOutDate) {
      const checkInDate = updateBookingDto.checkInDate
        ? new Date(updateBookingDto.checkInDate)
        : booking.checkInDate;
      const checkOutDate = updateBookingDto.checkOutDate
        ? new Date(updateBookingDto.checkOutDate)
        : booking.checkOutDate;
      const isAvailable = await this.checkRoomAvailability(
        booking.roomId.toString(),
        checkInDate,
        checkOutDate,
        id,
      );
      if (!isAvailable) {
        throw new BadRequestException(
          'Room is not available for the updated dates',
        );
      }
    }
    // Recalculate amounts if pricing changed
    let amounts = {
      totalRoomCharges: booking.totalRoomCharges,
      totalAdditionalCharges: booking.additionalCharges?.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      ) || 0,
      discount: booking.discount,
      tax: booking.tax,
      serviceCharge: booking.serviceCharge,
      totalAmount: booking.totalAmount,
    };
    if (
      updateBookingDto.roomRate ||
      updateBookingDto.checkInDate ||
      updateBookingDto.checkOutDate ||
      updateBookingDto.additionalCharges ||
      updateBookingDto.discount !== undefined ||
      updateBookingDto.taxRate !== undefined ||
      updateBookingDto.serviceChargeRate !== undefined
    ) {
      const checkInDate = updateBookingDto.checkInDate
        ? new Date(updateBookingDto.checkInDate)
        : booking.checkInDate;
      const checkOutDate = updateBookingDto.checkOutDate
        ? new Date(updateBookingDto.checkOutDate)
        : booking.checkOutDate;
      const numberOfNights = this.calculateNumberOfNights(checkInDate, checkOutDate);
      amounts = this.calculateBookingAmounts(
        updateBookingDto.roomRate || booking.roomRate,
        numberOfNights,
        updateBookingDto.additionalCharges || booking.additionalCharges || [],
        updateBookingDto.discount !== undefined ? updateBookingDto.discount : booking.discount,
        updateBookingDto.taxRate !== undefined ? updateBookingDto.taxRate : 0,
        updateBookingDto.serviceChargeRate !== undefined ? updateBookingDto.serviceChargeRate : 0,
      );
    }
    const updateData: any = {
      ...updateBookingDto,
      ...(updateBookingDto.checkInDate && { checkInDate: new Date(updateBookingDto.checkInDate) }),
      ...(updateBookingDto.checkOutDate && { checkOutDate: new Date(updateBookingDto.checkOutDate) }),
      ...(updateBookingDto.checkInDate || updateBookingDto.checkOutDate
        ? {
            numberOfNights: this.calculateNumberOfNights(
              updateBookingDto.checkInDate ? new Date(updateBookingDto.checkInDate) : booking.checkInDate,
              updateBookingDto.checkOutDate ? new Date(updateBookingDto.checkOutDate) : booking.checkOutDate,
            ),
          }
        : {}),
      totalRoomCharges: amounts.totalRoomCharges,
      discount: amounts.discount,
      tax: amounts.tax,
      serviceCharge: amounts.serviceCharge,
      totalAmount: amounts.totalAmount,
      balanceAmount: amounts.totalAmount - (booking.depositAmount || 0),
    };
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('roomId', 'roomNumber roomType')
      .populate('guestId', 'firstName lastName email phone');
    // Emit WebSocket event
    if (booking.branchId) {
      const branchId = typeof booking.branchId === 'object' && booking.branchId
        ? (booking.branchId as any)._id?.toString() || booking.branchId.toString()
        : booking.branchId.toString();
      this.websocketsGateway.emitToBranch(branchId, 'booking:updated', updatedBooking);
    }
    return updatedBooking;
  }
  async getStats(branchId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query: any = { branchId: new Types.ObjectId(branchId) };
    if (startDate && endDate) {
      query.checkInDate = { $gte: startDate, $lte: endDate };
    }
    const bookings = await this.bookingModel.find(query).exec();
    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      checkedIn: bookings.filter((b) => b.status === 'checked_in').length,
      checkedOut: bookings.filter((b) => b.status === 'checked_out').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter((b) => b.status === 'checked_out')
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      averageBookingValue: 0,
      occupancyRate: 0,
    };
    if (stats.checkedOut > 0) {
      stats.averageBookingValue = stats.totalRevenue / stats.checkedOut;
    }
    return stats;
  }
}