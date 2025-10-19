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
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientsService } from './ingredients.service';

@ApiTags('Ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new ingredient' })
  create(@Body() createIngredientDto: CreateIngredientDto) {
    return this.ingredientsService.create(createIngredientDto);
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk import ingredients' })
  bulkImport(
    @Body('companyId') companyId: string,
    @Body('ingredients') ingredients: CreateIngredientDto[],
  ) {
    return this.ingredientsService.bulkImport(companyId, ingredients);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ingredients' })
  findAll(@Query('companyId') companyId?: string) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    return this.ingredientsService.findAll(filter);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search ingredients' })
  search(@Query('companyId') companyId: string, @Query('q') query: string) {
    return this.ingredientsService.search(companyId, query);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get ingredients by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.ingredientsService.findByCompany(companyId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get ingredients by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.ingredientsService.findByBranch(branchId);
  }

  @Get('company/:companyId/low-stock')
  @ApiOperation({ summary: 'Get low stock ingredients' })
  findLowStock(@Param('companyId') companyId: string) {
    return this.ingredientsService.findLowStock(companyId);
  }

  @Get('company/:companyId/out-of-stock')
  @ApiOperation({ summary: 'Get out of stock ingredients' })
  findOutOfStock(@Param('companyId') companyId: string) {
    return this.ingredientsService.findOutOfStock(companyId);
  }

  @Get('company/:companyId/need-reorder')
  @ApiOperation({ summary: 'Get ingredients that need reorder' })
  findNeedReorder(@Param('companyId') companyId: string) {
    return this.ingredientsService.findNeedReorder(companyId);
  }

  @Get('company/:companyId/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get inventory statistics' })
  getStats(@Param('companyId') companyId: string) {
    return this.ingredientsService.getStats(companyId);
  }

  @Get('company/:companyId/valuation')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get inventory valuation' })
  getValuation(@Param('companyId') companyId: string) {
    return this.ingredientsService.getValuation(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update ingredient' })
  update(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(id, updateIngredientDto);
  }

  @Post(':id/adjust-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Adjust ingredient stock' })
  adjustStock(
    @Param('id') id: string,
    @Body() adjustmentDto: StockAdjustmentDto,
  ) {
    return this.ingredientsService.adjustStock(id, adjustmentDto);
  }

  @Post(':id/add-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add stock' })
  addStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.ingredientsService.addStock(id, quantity);
  }

  @Post(':id/remove-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove stock' })
  removeStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.ingredientsService.removeStock(id, quantity);
  }

  @Post(':id/update-pricing')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update unit cost' })
  updatePricing(@Param('id') id: string, @Body('unitCost') unitCost: number) {
    return this.ingredientsService.updatePricing(id, unitCost);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate ingredient' })
  deactivate(@Param('id') id: string) {
    return this.ingredientsService.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete ingredient' })
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }
}

