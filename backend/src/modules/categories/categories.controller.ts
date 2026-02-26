import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CategoriesService } from './categories.service';
import { CATEGORY_TYPES, CATEGORY_TYPE_LABELS } from './constants/category-types.constant';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get('types')
  @RequiresFeature(FEATURES.CATEGORIES, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
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
  @RequiresFeature(FEATURES.CATEGORIES)
  @ApiOperation({ summary: 'Create new category' })
  create(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can create categories');
    }
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @RequiresFeature(FEATURES.CATEGORIES, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
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
  @RequiresFeature(FEATURES.CATEGORIES, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Get categories by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.categoriesService.findByCompany(companyId);
  }

  @Get('branch/:branchId')
  @RequiresFeature(FEATURES.CATEGORIES, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Get categories by branch' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.categoriesService.findByBranch(branchId, companyId);
  }

  @Get(':id')
  @RequiresFeature(FEATURES.CATEGORIES, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.CATEGORIES)
  @ApiOperation({ summary: 'Update category' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update categories');
    }
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Patch(':id/toggle-status')
  @RequiresFeature(FEATURES.CATEGORIES)
  @ApiOperation({ summary: 'Toggle category active status' })
  toggleStatus(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can toggle category status');
    }
    return this.categoriesService.toggleStatus(id);
  }

  @Patch(':id/sort-order')
  @RequiresFeature(FEATURES.CATEGORIES)
  @ApiOperation({ summary: 'Update category sort order' })
  updateSortOrder(
    @Param('id') id: string,
    @Body('sortOrder') sortOrder: number,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update category sort order');
    }
    return this.categoriesService.updateSortOrder(id, sortOrder);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.CATEGORIES)
  @ApiOperation({ summary: 'Delete category' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can delete categories');
    }
    return this.categoriesService.remove(id);
  }
}

