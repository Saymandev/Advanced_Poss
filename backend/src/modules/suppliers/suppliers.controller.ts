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
import { SupplierFilterDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.SUPPLIERS)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all suppliers with pagination, filtering, and search' })
  findAll(@Query() filterDto: SupplierFilterDto) {
    return this.suppliersService.findAll(filterDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search suppliers' })
  search(@Query('companyId') companyId: string, @Query('q') query: string) {
    return this.suppliersService.search(companyId, query);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get suppliers by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.suppliersService.findByCompany(companyId);
  }

  @Get('company/:companyId/type/:type')
  @ApiOperation({ summary: 'Get suppliers by type' })
  findByType(@Param('companyId') companyId: string, @Param('type') type: string) {
    return this.suppliersService.findByType(companyId, type);
  }

  @Get('company/:companyId/preferred')
  @ApiOperation({ summary: 'Get preferred suppliers' })
  findPreferred(@Param('companyId') companyId: string) {
    return this.suppliersService.findPreferred(companyId);
  }

  @Get('company/:companyId/stats')
  @ApiOperation({ summary: 'Get supplier statistics' })
  getStats(@Param('companyId') companyId: string) {
    return this.suppliersService.getStats(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get supplier performance report' })
  getPerformanceReport(@Param('id') id: string) {
    return this.suppliersService.getPerformanceReport(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Patch(':id/rating')
  @ApiOperation({ summary: 'Update supplier rating' })
  updateRating(@Param('id') id: string, @Body('rating') rating: number) {
    return this.suppliersService.updateRating(id, rating);
  }

  @Post(':id/make-preferred')
  @ApiOperation({ summary: 'Make supplier preferred' })
  makePreferred(@Param('id') id: string) {
    return this.suppliersService.makePreferred(id);
  }

  @Post(':id/remove-preferred')
  @ApiOperation({ summary: 'Remove preferred status' })
  removePreferred(@Param('id') id: string) {
    return this.suppliersService.removePreferred(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate supplier' })
  deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate supplier' })
  activate(@Param('id') id: string) {
    return this.suppliersService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete supplier' })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}

