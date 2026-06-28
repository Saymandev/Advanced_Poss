import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { BusinessCategoriesService } from './business-categories.service';
import { CreateBusinessCategoryDto, UpdateBusinessCategoryDto } from './dto/business-category.dto';

@ApiTags('Business Categories')
@Controller('business-categories')
export class BusinessCategoriesController {
  constructor(private readonly businessCategoriesService: BusinessCategoriesService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get all active business categories (Public)' })
  @ApiResponse({ status: 200, description: 'Return all active business categories.' })
  async findPublic() {
    const categories = await this.businessCategoriesService.findAllActive();
    return { success: true, data: categories };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all business categories (Admin)' })
  async findAll(@CurrentUser() user: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can manage system categories');
    }
    const categories = await this.businessCategoriesService.findAll();
    return { success: true, data: categories };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new business category' })
  async create(@CurrentUser() user: any, @Body() createDto: CreateBusinessCategoryDto) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can manage system categories');
    }
    const category = await this.businessCategoriesService.create(createDto);
    return { success: true, data: category };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a business category' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateDto: UpdateBusinessCategoryDto) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can manage system categories');
    }
    const category = await this.businessCategoriesService.update(id, updateDto);
    return { success: true, data: category };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a business category' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can manage system categories');
    }
    await this.businessCategoriesService.remove(id);
    return { success: true, message: 'Category deleted successfully' };
  }
}
