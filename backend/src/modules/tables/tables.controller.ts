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
import { RequiresLimit } from '../../common/decorators/requires-limit.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { CreateTableDto } from './dto/create-table.dto';
import { ReserveTableDto } from './dto/reserve-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesService } from './tables.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@RequiresFeature(FEATURES.TABLE_MANAGEMENT)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Post()
  @RequiresLimit('maxTables')
  @ApiOperation({ summary: 'Create new table' })
  create(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.create(createTableDto);
  }

  @Post('bulk')
  @RequiresLimit('maxTables')
  @ApiOperation({ summary: 'Bulk create tables' })
  bulkCreate(
    @Body('branchId') branchId: string,
    @Body('count') count: number,
    @Body('prefix') prefix?: string,
  ) {
    return this.tablesService.bulkCreate(branchId, count, prefix);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tables' })
  findAll(@Query('branchId') branchId?: string, @Query('status') status?: string) {
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    return this.tablesService.findAll(filter);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get tables by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.tablesService.findByBranch(branchId);
  }

  @Get('branch/:branchId/available')
  @ApiOperation({ summary: 'Get available tables in branch' })
  findAvailable(@Param('branchId') branchId: string) {
    return this.tablesService.findAvailable(branchId);
  }

  @Get('branch/:branchId/stats')
  @ApiOperation({ summary: 'Get table statistics for branch' })
  getStats(@Param('branchId') branchId: string) {
    return this.tablesService.getStats(branchId);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Find table by QR code' })
  findByQrCode(@Param('qrCode') qrCode: string) {
    return this.tablesService.findByQrCode(qrCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table by ID' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update table' })
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.update(id, updateTableDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update table status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/reserve')
  @ApiOperation({ summary: 'Reserve table' })
  reserve(@Param('id') id: string, @Body() reserveDto: ReserveTableDto) {
    return this.tablesService.reserve(id, reserveDto);
  }

  @Post(':id/cancel-reservation')
  @ApiOperation({ summary: 'Cancel table reservation' })
  cancelReservation(@Param('id') id: string) {
    return this.tablesService.cancelReservation(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete table' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}

