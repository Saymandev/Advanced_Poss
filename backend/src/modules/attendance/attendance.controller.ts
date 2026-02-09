import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { AttendanceFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';
import { AttendanceService } from './attendance.service';
import { AttendanceCheckInDto } from './dto/attendance-check-in.dto';
import { AttendanceCheckOutDto } from './dto/attendance-check-out.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.ATTENDANCE)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly rolePermissionsService: RolePermissionsService,
  ) { }

  @Post('check-in')
  @RequiresFeature(FEATURES.ATTENDANCE)
  @ApiOperation({ summary: 'Check in for work' })
  checkIn(@Body() checkInDto: AttendanceCheckInDto, @Request() req: any) {
    // Use authenticated user's ID (required)
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.attendanceService.checkIn({
      ...checkInDto,
      userId: req.user.id,
    });
  }

  @Post('check-out')
  @RequiresFeature(FEATURES.ATTENDANCE)
  @ApiOperation({ summary: 'Check out from work' })
  checkOut(@Body() checkOutDto: AttendanceCheckOutDto, @Request() req: any) {
    // Use authenticated user's ID (required)
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.attendanceService.checkOut({
      ...checkOutDto,
      userId: req.user.id,
    });
  }

  @Post(':userId/force-check-out')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Force check out for a user (Manager/Owner only)' })
  forceCheckOut(
    @Param('userId') userId: string,
    @Body() checkOutDto: AttendanceCheckOutDto,
    @CurrentUser('id') managerId?: string,
  ) {
    return this.attendanceService.checkOut({
      ...checkOutDto,
      userId,
      notes: checkOutDto.notes
        ? `${checkOutDto.notes}\n[Force checked out by manager]`
        : '[Force checked out by manager]',
    });
  }

  @Get()
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Get all attendance records with pagination, filtering, and search' })
  findAll(@Query() filterDto: AttendanceFilterDto) {
    return this.attendanceService.findAll(filterDto);
  }

  @Get('branch/:branchId/today')
  @RequiresFeature(FEATURES.ATTENDANCE)
  @ApiOperation({ summary: 'Get today\'s attendance for branch' })
  async getTodayAttendance(
    @Param('branchId') branchId: string,
    @Request() req: any,
  ) {
    // Check if user has STAFF_MANAGEMENT permission to view all
    const userRole = req.user?.role;
    let canViewAll = userRole === UserRole.SUPER_ADMIN;

    if (!canViewAll) {
      const permissions = await this.rolePermissionsService.getRolePermission(
        req.user.companyId || req.user.company?._id,
        userRole,
      );
      canViewAll = permissions?.features?.includes(FEATURES.STAFF_MANAGEMENT);
    }

    const userId = canViewAll ? undefined : req.user.id;
    return this.attendanceService.getTodayAttendance(branchId, userId);
  }

  @Get('branch/:branchId')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Get attendance by branch' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.findByBranch(
      branchId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get attendance by user' })
  findByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.findByUser(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('user/:userId/monthly/:year/:month')
  @ApiOperation({ summary: 'Get user monthly attendance stats' })
  getUserMonthlyStats(
    @Param('userId') userId: string,
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.attendanceService.getUserMonthlyStats(userId, +year, +month);
  }

  @Get('stats/:branchId')
  @RequiresFeature(FEATURES.ATTENDANCE)
  @ApiOperation({ summary: 'Get attendance statistics' })
  async getStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    // Check if user has STAFF_MANAGEMENT permission to view all stats
    const userRole = req.user?.role;
    let canViewAll = userRole === UserRole.SUPER_ADMIN;

    if (!canViewAll) {
      const permissions = await this.rolePermissionsService.getRolePermission(
        req.user.companyId || req.user.company?._id,
        userRole,
      );
      canViewAll = permissions?.features?.includes(FEATURES.STAFF_MANAGEMENT);
    }

    const userId = canViewAll ? undefined : req.user.id;
    return this.attendanceService.getStats(
      branchId,
      new Date(startDate),
      new Date(endDate),
      userId,
    );
  }

  @Get(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Get attendance by ID' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Post('mark-absent')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Mark user as absent' })
  markAbsent(
    @Body('userId') userId: string,
    @Body('branchId') branchId: string,
    @Body('date') date: string,
  ) {
    return this.attendanceService.markAbsent(userId, branchId, new Date(date));
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Update attendance record' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.attendanceService.update(id, updateData);
  }

  @Post(':id/approve')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Approve attendance record' })
  approve(@Param('id') id: string, @Body('approverId') approverId: string) {
    return this.attendanceService.approve(id, approverId);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Delete attendance record' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}

