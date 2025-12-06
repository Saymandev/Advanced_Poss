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
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresRoleFeature } from '../../common/decorators/requires-role-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttendanceFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RoleFeatureGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.ATTENDANCE)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @RequiresRoleFeature('attendance')
  @ApiOperation({ summary: 'Check in for work' })
  checkIn(@Body() checkInDto: CheckInDto, @Request() req: any) {
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
  @RequiresRoleFeature('attendance')
  @ApiOperation({ summary: 'Check out from work' })
  checkOut(@Body() checkOutDto: CheckOutDto, @Request() req: any) {
    // Use authenticated user's ID (required)
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.attendanceService.checkOut({
      ...checkOutDto,
      userId: req.user.id,
    });
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all attendance records with pagination, filtering, and search' })
  findAll(@Query() filterDto: AttendanceFilterDto) {
    return this.attendanceService.findAll(filterDto);
  }

  @Get('branch/:branchId/today')
  @RequiresRoleFeature('attendance')
  @ApiOperation({ summary: 'Get today\'s attendance for branch' })
  getTodayAttendance(
    @Param('branchId') branchId: string,
    @Request() req: any,
  ) {
    // Only owners/managers can see all employees, others see only their own
    const userRole = req.user?.role;
    const userId = (userRole === UserRole.OWNER || userRole === UserRole.MANAGER || userRole === UserRole.SUPER_ADMIN)
      ? undefined
      : req.user?.id;
    return this.attendanceService.getTodayAttendance(branchId, userId);
  }

  @Get('branch/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @RequiresRoleFeature('attendance')
  @ApiOperation({ summary: 'Get attendance statistics' })
  getStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    // Only owners/managers can see all employees stats, others see only their own
    const userRole = req.user?.role;
    const userId = (userRole === UserRole.OWNER || userRole === UserRole.MANAGER || userRole === UserRole.SUPER_ADMIN)
      ? undefined
      : req.user?.id;
    return this.attendanceService.getStats(
      branchId,
      new Date(startDate),
      new Date(endDate),
      userId,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get attendance by ID' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Post('mark-absent')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark user as absent' })
  markAbsent(
    @Body('userId') userId: string,
    @Body('branchId') branchId: string,
    @Body('date') date: string,
  ) {
    return this.attendanceService.markAbsent(userId, branchId, new Date(date));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update attendance record' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.attendanceService.update(id, updateData);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve attendance record' })
  approve(@Param('id') id: string, @Body('approverId') approverId: string) {
    return this.attendanceService.approve(id, approverId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete attendance record' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}

