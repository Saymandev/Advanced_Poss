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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CATEGORY_TYPES, CATEGORY_TYPE_LABELS } from './constants/category-types.constant';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.CATEGORIES)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get available category types' })
  getCategoryTypes() {
    return {
      types: CATEGORY_TYPES.map((type) => ({
        value: type,
        label: CATEGORY_TYPE_LABELS[type as keyof typeof CATEGORY_TYPE_LABELS],
      })),
    };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new category' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
  ) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    return this.categoriesService.findAll(filter);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get categories by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.categoriesService.findByCompany(companyId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get categories by branch' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.categoriesService.findByBranch(branchId, companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update category' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle category active status' })
  toggleStatus(@Param('id') id: string) {
    return this.categoriesService.toggleStatus(id);
  }

  @Patch(':id/sort-order')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update category sort order' })
  updateSortOrder(
    @Param('id') id: string,
    @Body('sortOrder') sortOrder: number,
  ) {
    return this.categoriesService.updateSortOrder(id, sortOrder);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete category' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}

