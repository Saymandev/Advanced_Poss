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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new supplier' })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all suppliers' })
  findAll(@Query('companyId') companyId?: string, @Query('type') type?: string) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (type) filter.type = type;
    return this.suppliersService.findAll(filter);
  }

  @Get('search')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Search suppliers' })
  search(@Query('companyId') companyId: string, @Query('q') query: string) {
    return this.suppliersService.search(companyId, query);
  }

  @Get('company/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get suppliers by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.suppliersService.findByCompany(companyId);
  }

  @Get('company/:companyId/type/:type')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get suppliers by type' })
  findByType(@Param('companyId') companyId: string, @Param('type') type: string) {
    return this.suppliersService.findByType(companyId, type);
  }

  @Get('company/:companyId/preferred')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get preferred suppliers' })
  findPreferred(@Param('companyId') companyId: string) {
    return this.suppliersService.findPreferred(companyId);
  }

  @Get('company/:companyId/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get supplier statistics' })
  getStats(@Param('companyId') companyId: string) {
    return this.suppliersService.getStats(companyId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get supplier by ID' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get supplier performance report' })
  getPerformanceReport(@Param('id') id: string) {
    return this.suppliersService.getPerformanceReport(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update supplier' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Patch(':id/rating')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update supplier rating' })
  updateRating(@Param('id') id: string, @Body('rating') rating: number) {
    return this.suppliersService.updateRating(id, rating);
  }

  @Post(':id/make-preferred')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Make supplier preferred' })
  makePreferred(@Param('id') id: string) {
    return this.suppliersService.makePreferred(id);
  }

  @Post(':id/remove-preferred')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove preferred status' })
  removePreferred(@Param('id') id: string) {
    return this.suppliersService.removePreferred(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate supplier' })
  deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Activate supplier' })
  activate(@Param('id') id: string) {
    return this.suppliersService.activate(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete supplier' })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}

