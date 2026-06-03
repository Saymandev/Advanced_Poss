import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { Category } from '../categories/schemas/category.schema';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@RequiresFeature(FEATURES.MENU_MANAGEMENT)
@Controller('menu-items')
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly cloudinaryService: CloudinaryService,
    @InjectModel(Category.name) private readonly categoryModel: Model<any>,
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
  findAll(@Query() filterDto: MenuItemFilterDto, @Req() req: any) {
    if (!filterDto.companyId && req.user?.companyId) {
      filterDto.companyId = req.user.companyId;
    }
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

  @Get('alerts/expiring')
  @ApiOperation({ summary: 'Get products near expiry' })
  getExpiringProducts(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    return this.menuItemsService.getExpiringProducts(
      req.user.companyId,
      req.user.branchId,
      days ? parseInt(days, 10) : 30
    );
  }

  @Post(':id/generate-barcode')
  @ApiOperation({ summary: 'Generate unique store barcode for product' })
  async generateBarcode(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const companyId = req.user.companyId;
    const barcode = await this.menuItemsService.generateUniqueBarcode(companyId);
    
    // Update the product with the new barcode
    const updated = await this.menuItemsService.update(id, { barcode });
    return { success: true, barcode, product: updated };
  }

  @Post('bulk-import-csv')
  @ApiOperation({ summary: 'Bulk import products from CSV file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImportCSV(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No CSV file uploaded');
    }

    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Parse CSV content
    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have a header row and at least one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['name', 'price'];
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new BadRequestException(`CSV must include "${required}" column. Found: ${headers.join(', ')}`);
      }
    }

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || '';
        switch (header) {
          case 'name': row.name = val; break;
          case 'barcode': row.barcode = val; break;
          case 'sku': row.sku = val; break;
          case 'price': row.price = parseFloat(val) || 0; break;
          case 'cost': row.cost = val ? parseFloat(val) : undefined; break;
          case 'category': row.category = val; break;
          case 'unit': case 'unittype': row.unitType = val; break;
          case 'weightbased': row.weightBased = val.toLowerCase() === 'true' || val === '1'; break;
          case 'stock': row.stock = val ? parseInt(val, 10) : undefined; break;
          case 'minimumstock': case 'minstock': row.minimumStock = val ? parseInt(val, 10) : undefined; break;
          case 'description': row.description = val; break;
          case 'expirydate': row.expiryDate = val; break;
          case 'batchnumber': case 'batch': row.batchNumber = val; break;
        }
      });
      rows.push(row);
    }

    const result = await this.menuItemsService.bulkImportFromCSV(
      companyId,
      branchId,
      rows,
      this.categoryModel,
    );

    return {
      success: true,
      message: `Import complete: ${result.imported} imported, ${result.skipped} skipped`,
      ...result,
    };
  }

  @Get('download-csv-template')
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  downloadCSVTemplate() {
    const template = 'name,barcode,sku,price,cost,category,unit,stock,minimumstock,expirydate,batchnumber,description\n';
    return {
      success: true,
      template,
      columns: [
        { name: 'name', required: true, description: 'Product name' },
        { name: 'barcode', required: false, description: 'Product barcode (EAN/UPC)' },
        { name: 'sku', required: false, description: 'Stock keeping unit code' },
        { name: 'price', required: true, description: 'Selling price' },
        { name: 'cost', required: false, description: 'Purchase/cost price' },
        { name: 'category', required: false, description: 'Category name (auto-created if new)' },
        { name: 'unit', required: false, description: 'Unit type: kg, g, piece, liter, etc.' },
        { name: 'stock', required: false, description: 'Current stock quantity' },
        { name: 'minimumstock', required: false, description: 'Minimum stock alert level' },
        { name: 'expirydate', required: false, description: 'Expiry date (YYYY-MM-DD)' },
        { name: 'batchnumber', required: false, description: 'Batch number' },
        { name: 'description', required: false, description: 'Product description' },
      ],
    };
  }

  @Patch(':id/adjust-stock')
  @ApiOperation({ summary: 'Adjust product stock (add, remove, or set)' })
  adjustStock(
    @Param('id') id: string,
    @Body() body: { type: 'add' | 'remove' | 'set'; quantity: number },
  ) {
    return this.menuItemsService.adjustStock(id, body);
  }
}

