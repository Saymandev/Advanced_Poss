import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreatePurchaseReturnDto, UpdatePurchaseReturnDto } from './dto/purchase-return.dto';
import { PurchaseReturnsService } from './purchase-returns.service';

@ApiTags('Purchase Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.INVENTORY)
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private readonly service: PurchaseReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create purchase return' })
  create(@Body() dto: CreatePurchaseReturnDto, @CurrentUser('id') userId: string, @CurrentUser('companyId') companyId: string) {
    return this.service.create(dto, companyId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase returns' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      companyId,
      branchId,
      status,
      supplierId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase return by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update purchase return status' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseReturnDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete purchase return' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
