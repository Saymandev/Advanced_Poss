import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { EndWorkPeriodDto } from './dto/end-work-period.dto';
import { StartWorkPeriodDto } from './dto/start-work-period.dto';
import { WorkPeriodsService } from './work-periods.service';

@ApiTags('Work Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.WORK_PERIODS)
@Controller('work-periods')
export class WorkPeriodsController {
  constructor(private readonly workPeriodsService: WorkPeriodsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all work periods' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'active' | 'completed',
    @CurrentUser('role') role?: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('companyId') companyId?: string,
    @CurrentUser('branchId') branchId?: string,
  ) {
    return this.workPeriodsService.findAll({
      page: page || 1,
      limit: limit || 10,
      status,
      companyId,
      role,
      userId,
      userBranchId: branchId,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active work period' })
  async findActive(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('branchId') branchId: string,
  ) {
    const activePeriod = await this.workPeriodsService.findActive(companyId, branchId);
    // Return null explicitly if no active period found (not undefined)
    if (!activePeriod) {
      return null;
    }
    return activePeriod;
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new work period' })
  startWorkPeriod(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('branchId') branchId: string,
    @Body() startWorkPeriodDto: StartWorkPeriodDto,
  ) {
    return this.workPeriodsService.startWorkPeriod(
      userId,
      companyId,
      branchId,
      startWorkPeriodDto,
    );
  }

  @Post(':id/end')
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
  getSalesSummary(
    @Param('id') id: string,
    @CurrentUser('branchId') branchId?: string,
  ) {
    return this.workPeriodsService.getSalesSummary(id, branchId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get activities during work period' })
  getPeriodActivities(
    @Param('id') id: string,
    @CurrentUser('branchId') branchId?: string,
  ) {
    return this.workPeriodsService.getPeriodActivities(id, branchId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download work period report as PDF' })
  async downloadReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.workPeriodsService.generateWorkPeriodReport(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=work-period-${id}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Post(':id/email')
  @ApiOperation({ summary: 'Email work period report to owner' })
  async emailReport(
    @Param('id') id: string,
    @Body('email') email: string,
    @CurrentUser('email') userEmail: string,
  ) {
    const targetEmail = email || userEmail;
    if (!targetEmail) {
      throw new BadRequestException('Email address is required');
    }

    await this.workPeriodsService.emailWorkPeriodReport(id, targetEmail);
    return { success: true, message: `Report sent to ${targetEmail}` };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work period by ID' })
  findOne(@Param('id') id: string) {
    return this.workPeriodsService.findOne(id);
  }
}
