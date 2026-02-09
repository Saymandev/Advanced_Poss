import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'; // Added missing swagger imports for consistency if needed, though file didn't have them. Wait, file didn't have swagger. I should keep it simple.
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard'; // Assuming subscription applies
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleFiltersDto } from './dto/schedule-filters.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.SCHEDULE)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  // Create a new shift
  @Post('shifts')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async createShift(@Body() createScheduleDto: CreateScheduleDto, @Request() req) {
    return this.scheduleService.createShift(createScheduleDto, req.user.id);
  }

  // Get all shifts with filters
  @Get('shifts')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async getShifts(@Query() filters: ScheduleFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.scheduleService.getShifts(filtersWithBranch);
  }

  // Get shift by ID
  @Get('shifts/:id')
  async getShiftById(@Param('id') id: string) {
    return this.scheduleService.getShiftById(id);
  }

  // Update shift
  @Put('shifts/:id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async updateShift(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto, @Request() req) {
    return this.scheduleService.updateShift(id, updateScheduleDto, req.user.id);
  }

  // Delete shift
  @Delete('shifts/:id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async deleteShift(@Param('id') id: string) {
    return this.scheduleService.deleteShift(id);
  }

  // Update shift status
  @Patch('shifts/:id/status')
  async updateShiftStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Request() req,
  ) {
    return this.scheduleService.updateShiftStatus(id, body.status, req.user.id, body.reason);
  }

  // Get shifts by date range
  @Get('shifts/date-range')
  async getShiftsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.scheduleService.getShiftsByDateRange(req.user.branchId, startDate, endDate);
  }

  // Get schedule statistics
  @Get('stats')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async getScheduleStats(@Query() filters: ScheduleFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.scheduleService.getScheduleStats(filtersWithBranch);
  }

  // Get upcoming shifts for current user
  @Get('upcoming')
  async getUpcomingShifts(@Query('limit') limit: number = 10, @Request() req) {
    return this.scheduleService.getUpcomingShifts(req.user.id, limit);
  }

  // Get shifts for a specific user
  @Get('user/:userId')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  async getUserShifts(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.scheduleService.getUserShifts(userId, startDate, endDate);
  }

  // Get my shifts (for current user)
  @Get('my-shifts')
  async getMyShifts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.scheduleService.getUserShifts(req.user.id, startDate, endDate);
  }
}
