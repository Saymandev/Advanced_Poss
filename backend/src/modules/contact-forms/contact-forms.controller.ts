
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ContactFormsService } from './contact-forms.service';
import { UpdateContactFormDto } from './dto/update-contact-form.dto';
@ApiTags('Contact Forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.NOTIFICATIONS)
@Controller('contact-forms')
export class ContactFormsController {
  constructor(private readonly contactFormsService: ContactFormsService) { }
  @Get()
  @ApiOperation({ summary: 'Get all contact forms (filtered by company for non-super-admin)' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID (null for general inquiries)' })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'read', 'replied', 'archived'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: UserDocument,
  ) {
    // For non-super-admin users, filter by their company
    let filterCompanyId = companyId;
    if (user?.role !== UserRole.SUPER_ADMIN && user?.companyId) {
      filterCompanyId = (user.companyId as any).toString();
    }
    // Debug logging
    return this.contactFormsService.findAll({
      companyId: filterCompanyId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
  @Get('stats')
  @ApiOperation({ summary: 'Get contact form statistics' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID (null for general inquiries)' })
  async getStats(
    @Query('companyId') companyId?: string,
    @CurrentUser() user?: UserDocument,
  ) {
    // For non-super-admin users, filter by their company
    let filterCompanyId = companyId;
    if (user?.role !== UserRole.SUPER_ADMIN && user?.companyId) {
      filterCompanyId = (user.companyId as any).toString();
    }
    // Debug logging
    return this.contactFormsService.getStats(filterCompanyId);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get contact form by ID' })
  async findOne(@Param('id') id: string) {
    return this.contactFormsService.findOne(id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update contact form (status, notes)' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContactFormDto,
    @CurrentUser() user: UserDocument,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update contact forms');
    }
    return this.contactFormsService.update(id, updateDto, user.id);
  }
}
