import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EndWorkPeriodDto } from './dto/end-work-period.dto';
import { StartWorkPeriodDto } from './dto/start-work-period.dto';
import { WorkPeriodsService } from './work-periods.service';

@ApiTags('Work Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-periods')
export class WorkPeriodsController {
  constructor(private readonly workPeriodsService: WorkPeriodsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all work periods' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'active' | 'completed',
    @CurrentUser('companyId') companyId?: string,
  ) {
    return this.workPeriodsService.findAll({
      page: page || 1,
      limit: limit || 10,
      status,
      companyId,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active work period' })
  findActive(@CurrentUser('companyId') companyId: string) {
    return this.workPeriodsService.findActive(companyId);
  }

  @Post('start')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.WAITER)
  @ApiOperation({ summary: 'Start a new work period' })
  startWorkPeriod(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() startWorkPeriodDto: StartWorkPeriodDto,
  ) {
    return this.workPeriodsService.startWorkPeriod(
      userId,
      companyId,
      startWorkPeriodDto,
    );
  }

  @Post(':id/end')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.WAITER)
  @ApiOperation({ summary: 'End a work period' })
  endWorkPeriod(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() endWorkPeriodDto: EndWorkPeriodDto,
  ) {
    return this.workPeriodsService.endWorkPeriod(id, userId, endWorkPeriodDto);
  }

  @Get(':id/sales-summary')
  @ApiOperation({ summary: 'Get sales summary for work period' })
  getSalesSummary(@Param('id') id: string) {
    return this.workPeriodsService.getSalesSummary(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work period by ID' })
  findOne(@Param('id') id: string) {
    return this.workPeriodsService.findOne(id);
  }
}
