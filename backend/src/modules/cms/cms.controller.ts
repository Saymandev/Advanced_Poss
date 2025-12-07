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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CmsService } from './cms.service';
import { CreateContentPageDto } from './dto/create-content-page.dto';
import { UpdateContentPageDto } from './dto/update-content-page.dto';
import {
    ContentPageStatus,
    ContentPageType,
} from './schemas/content-page.schema';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new content page (Super Admin only)' })
  create(
    @Body() createContentPageDto: CreateContentPageDto,
    @CurrentUser() user: any,
  ) {
    return this.cmsService.create(createContentPageDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all content pages (Super Admin only)' })
  findAll(
    @Query('type') type?: ContentPageType,
    @Query('status') status?: ContentPageStatus,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.cmsService.findAll({
      type,
      status,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get published content pages (Public)' })
  findPublic(
    @Query('type') type?: ContentPageType,
    @Query('featured') featured?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cmsService.findByType(type || ContentPageType.PAGE, {
      status: ContentPageStatus.PUBLISHED,
      featured: featured === 'true' ? true : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('public/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get content page by slug (Public)' })
  findOneBySlug(@Param('slug') slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get categories for a content type (Public)' })
  getCategories(@Query('type') type: ContentPageType) {
    return this.cmsService.getCategories(type);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content page by ID (Super Admin only)' })
  findOne(@Param('id') id: string) {
    return this.cmsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update content page (Super Admin only)' })
  update(
    @Param('id') id: string,
    @Body() updateContentPageDto: UpdateContentPageDto,
    @CurrentUser() user: any,
  ) {
    return this.cmsService.update(id, updateContentPageDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete content page (soft delete) (Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.cmsService.remove(id);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete content page (Super Admin only)' })
  hardDelete(@Param('id') id: string) {
    return this.cmsService.hardDelete(id);
  }
}

