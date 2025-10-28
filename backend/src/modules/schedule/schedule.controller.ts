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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleFiltersDto } from './dto/schedule-filters.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Create a new shift
  @Post('shifts')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async createShift(@Body() createScheduleDto: CreateScheduleDto, @Request() req) {
    return this.scheduleService.createShift(createScheduleDto, req.user.id);
  }

  // Get all shifts with filters
  @Get('shifts')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async getShifts(@Query() filters: ScheduleFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.scheduleService.getShifts(filtersWithBranch);
  }

  // Get shift by ID
  @Get('shifts/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async getShiftById(@Param('id') id: string) {
    return this.scheduleService.getShiftById(id);
  }

  // Update shift
  @Put('shifts/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updateShift(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto, @Request() req) {
    return this.scheduleService.updateShift(id, updateScheduleDto, req.user.id);
  }

  // Delete shift
  @Delete('shifts/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async deleteShift(@Param('id') id: string) {
    return this.scheduleService.deleteShift(id);
  }

  // Update shift status
  @Patch('shifts/:id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async updateShiftStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Request() req,
  ) {
    return this.scheduleService.updateShiftStatus(id, body.status, req.user.id, body.reason);
  }

  // Get shifts by date range
  @Get('shifts/date-range')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async getShiftsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.scheduleService.getShiftsByDateRange(req.user.branchId, startDate, endDate);
  }

  // Get schedule statistics
  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getScheduleStats(@Query() filters: ScheduleFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.scheduleService.getScheduleStats(filtersWithBranch);
  }

  // Get upcoming shifts for current user
  @Get('upcoming')
  @Roles(UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async getUpcomingShifts(@Query('limit') limit: number = 10, @Request() req) {
    return this.scheduleService.getUpcomingShifts(req.user.id, limit);
  }

  // Get shifts for a specific user
  @Get('user/:userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getUserShifts(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.scheduleService.getUserShifts(userId, startDate, endDate);
  }

  // Get my shifts (for current user)
  @Get('my-shifts')
  @Roles(UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER)
  async getMyShifts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.scheduleService.getUserShifts(req.user.id, startDate, endDate);
  }
}
