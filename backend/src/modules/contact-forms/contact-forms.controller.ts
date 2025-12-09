import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ContactFormsService } from './contact-forms.service';
import { UpdateContactFormDto } from './dto/update-contact-form.dto';

@ApiTags('Contact Forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contact-forms')
export class ContactFormsController {
  constructor(private readonly contactFormsService: ContactFormsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contact forms (filtered by company for non-super-admin)' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID (null for general inquiries)' })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'read', 'replied', 'archived'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
    console.log('[ContactFormsController] findAll:', {
      userRole: user?.role,
      userCompanyId: user?.companyId,
      queryCompanyId: companyId,
      filterCompanyId,
      status,
      search,
    });

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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
    console.log('[ContactFormsController] getStats:', {
      userRole: user?.role,
      userCompanyId: user?.companyId,
      queryCompanyId: companyId,
      filterCompanyId,
    });

    return this.contactFormsService.getStats(filterCompanyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact form by ID' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string) {
    return this.contactFormsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact form (status, notes)' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContactFormDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.contactFormsService.update(id, updateDto, user.id);
  }
}

