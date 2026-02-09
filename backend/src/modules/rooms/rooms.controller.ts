import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Post('bulk')
  bulkCreate(
    @Body('branchId') branchId: string,
    @Body('count') count: number,
    @Body('prefix') prefix?: string,
    @Body('startNumber') startNumber?: number,
  ) {
    return this.roomsService.bulkCreate(branchId, count, prefix, startNumber);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  findAll(@Query('branchId') branchId?: string, @Query('status') status?: string) {
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    return this.roomsService.findAll(filter);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get rooms by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.roomsService.findByBranch(branchId);
  }

  @Get('branch/:branchId/available')
  @ApiOperation({ summary: 'Get available rooms in branch' })
  findAvailable(
    @Param('branchId') branchId: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
  ) {
    const checkIn = checkInDate ? new Date(checkInDate) : undefined;
    const checkOut = checkOutDate ? new Date(checkOutDate) : undefined;
    return this.roomsService.findAvailable(branchId, checkIn, checkOut);
  }

  @Get('branch/:branchId/stats')
  @ApiOperation({ summary: 'Get room statistics for branch' })
  getStats(@Param('branchId') branchId: string) {
    return this.roomsService.getStats(branchId);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Find room by QR code' })
  findByQrCode(@Param('qrCode') qrCode: string) {
    return this.roomsService.findByQrCode(qrCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update room status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateRoomStatusDto,
  ) {
    return this.roomsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
