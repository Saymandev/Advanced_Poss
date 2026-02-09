import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresLimit } from '../../common/decorators/requires-limit.decorator';
import { MenuItemFilterDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemsService } from './menu-items.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@RequiresFeature(FEATURES.MENU_MANAGEMENT)
@Controller('menu-items')
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post('upload-images')
  @ApiOperation({ summary: 'Upload images for menu items to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10)) // Allow up to 10 images
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    try {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file.buffer, 'menu-items'),
      );
      const results = await Promise.all(uploadPromises);

      return {
        success: true,
        images: results.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  @Post()
  @RequiresLimit('maxMenuItems')
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
  @ApiOperation({ summary: 'Update menu item' })
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update(id, updateMenuItemDto);
  }

  @Patch(':id/toggle-availability')
  @ApiOperation({ summary: 'Toggle menu item availability' })
  toggleAvailability(@Param('id') id: string) {
    return this.menuItemsService.toggleAvailability(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete menu item' })
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }
}

