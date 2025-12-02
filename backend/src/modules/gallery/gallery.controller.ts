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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { GalleryService } from './gallery.service';

@ApiTags('Gallery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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

    return this.galleryService.create(companyId, file, createGalleryDto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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

    return this.galleryService.update(id, companyId, updateGalleryDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a gallery image' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const companyId = (user as any).companyId || (user as any).company?.id;
    
    if (!companyId) {
      throw new Error('Company ID not found');
    }

    await this.galleryService.remove(id, companyId);
    return { success: true, message: 'Gallery image deleted successfully' };
  }

  @Post('reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reorder gallery images' })
  async reorder(
    @CurrentUser() user: any,
    @Body('imageIds') imageIds: string[],
  ) {
    const companyId = (user as any).companyId || (user as any).company?.id;
    
    if (!companyId) {
      throw new Error('Company ID not found');
    }

    await this.galleryService.reorder(companyId, imageIds);
    return { success: true, message: 'Gallery images reordered successfully' };
  }
}

