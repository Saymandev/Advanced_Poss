import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { GalleryService } from './gallery.service';

@ApiTags('Gallery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.CMS)
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Get()
  @ApiOperation({ summary: 'Get all gallery images for company' })
  async findAll(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: string,
  ) {
    const companyId = (user as any).companyId || (user as any).company?.id;

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.galleryService.findAll(companyId, activeFilter);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a new gallery image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        caption: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        displayOrder: {
          type: 'number',
        },
        isActive: {
          type: 'boolean',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() createGalleryDto: CreateGalleryDto,
  ) {
    const companyId = (user as any).companyId || (user as any).company?.id;

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can upload gallery images');
    }

    return this.galleryService.create(companyId, file, createGalleryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update gallery image metadata' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateGalleryDto: UpdateGalleryDto,
  ) {
    const companyId = (user as any).companyId || (user as any).company?.id;

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update gallery images');
    }

    return this.galleryService.update(id, companyId, updateGalleryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gallery image' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const companyId = (user as any).companyId || (user as any).company?.id;

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can delete gallery images');
    }

    await this.galleryService.remove(id, companyId);
    return { success: true, message: 'Gallery image deleted successfully' };
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder gallery images' })
  async reorder(
    @CurrentUser() user: any,
    @Body('imageIds') imageIds: string[],
  ) {
    const companyId = (user as any).companyId || (user as any).company?.id;

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can reorder gallery images');
    }

    await this.galleryService.reorder(companyId, imageIds);
    return { success: true, message: 'Gallery images reordered successfully' };
  }
}

