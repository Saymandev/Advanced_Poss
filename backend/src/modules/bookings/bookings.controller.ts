import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { BookingsService } from './bookings.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.BOOKING_MANAGEMENT)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new booking' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.bookingsService.create(createBookingDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('roomId') roomId?: string,
  ) {
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (roomId) filter.roomId = roomId;
    return this.bookingsService.findAll(filter);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get bookings by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.bookingsService.findByBranch(branchId);
  }

  @Get('branch/:branchId/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get booking statistics for branch' })
  getStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.bookingsService.getStats(branchId, start, end);
  }

  @Get('availability/:roomId')
  @ApiOperation({ summary: 'Check room availability' })
  checkAvailability(
    @Param('roomId') roomId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.bookingsService.checkRoomAvailability(
      roomId,
      new Date(checkInDate),
      new Date(checkOutDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update booking' })
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Post(':id/check-in')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Check in guest' })
  checkIn(
    @Param('id') id: string,
    @Body() checkInDto: CheckInDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.bookingsService.checkIn(id, checkInDto, userId);
  }

  @Post(':id/check-out')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Check out guest' })
  checkOut(
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.bookingsService.checkOut(id, checkOutDto, userId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel booking' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Body('refundAmount') refundAmount?: number,
  ) {
    return this.bookingsService.cancel(id, reason, refundAmount);
  }
}

