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
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemFilterDto } from '../../common/dto/pagination.dto';
import { MenuItemsService } from './menu-items.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new menu item' })
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all menu items with pagination, filtering, and search' })
  findAll(@Query() filterDto: MenuItemFilterDto) {
    return this.menuItemsService.findAll(filterDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search menu items' })
  search(@Query('q') query: string, @Query('companyId') companyId: string) {
    return this.menuItemsService.search(query, companyId);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular menu items' })
  findPopular(
    @Query('companyId') companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuItemsService.findPopular(companyId, parseInt(limit) || 10);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get menu items by category' })
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.menuItemsService.findByCategory(categoryId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get menu items by branch' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.menuItemsService.findByBranch(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update menu item' })
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update(id, updateMenuItemDto);
  }

  @Patch(':id/toggle-availability')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle menu item availability' })
  toggleAvailability(@Param('id') id: string) {
    return this.menuItemsService.toggleAvailability(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete menu item' })
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }
}

