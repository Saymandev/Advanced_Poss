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
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkPeriodCheckGuard } from '../../common/guards/work-period-check.guard';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@ApiTags('Delivery Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, WorkPeriodCheckGuard)
@RequiresFeature(FEATURES.DELIVERY_MANAGEMENT)
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) { }

  @Post('find-zone')
  @ApiOperation({ summary: 'Find delivery zone by address (internal)' })
  async findZone(@Body() addressData: any, @Request() req: any) {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId || req.body.branchId || addressData.branchId;
    const zone = await this.zonesService.findZoneByAddress(companyId, branchId, addressData);
    return { success: true, data: zone };
  }

  @Post()
  @ApiOperation({ summary: 'Create delivery zone' })
  create(@Body() createZoneDto: CreateDeliveryZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all delivery zones' })
  findAll(@Query('companyId') companyId?: string, @Query('branchId') branchId?: string) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (branchId) filter.branchId = branchId;
    return this.zonesService.findAll(filter);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get zones by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.zonesService.findByCompany(companyId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get zones by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.zonesService.findByBranch(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get zone by ID' })
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery zone' })
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateDeliveryZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery zone' })
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}

