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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AddCustomDomainDto } from './dto/add-custom-domain.dto';
import { VerifyCustomDomainDto } from './dto/verify-custom-domain.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create new company' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all companies' })
  findAll(@Query('ownerId') ownerId?: string) {
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
    return this.companiesService.findAll(filter);
  }

  @Get('my-companies')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get current user companies' })
  getMyCompanies(@CurrentUser('id') userId: string) {
    return this.companiesService.findByOwner(userId);
  }

  @Get('system/stats')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system-wide statistics (Super Admin only)' })
  getSystemStats() {
    return this.companiesService.getSystemStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get company statistics' })
  getStats(@Param('id') id: string) {
    return this.companiesService.getStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Patch(':id/settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.companiesService.updateSettings(id, settings);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Deactivate company' })
  deactivate(@Param('id') id: string) {
    return this.companiesService.deactivate(id);
  }

  @Post(':id/custom-domain')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add custom domain to company' })
  addCustomDomain(@Param('id') id: string, @Body() addDomainDto: AddCustomDomainDto) {
    return this.companiesService.addCustomDomain(id, addDomainDto);
  }

  @Post(':id/custom-domain/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Verify custom domain ownership' })
  verifyCustomDomain(@Param('id') id: string, @Body() verifyDto: VerifyCustomDomainDto) {
    return this.companiesService.verifyCustomDomain(id, verifyDto);
  }

  @Get(':id/custom-domain')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get custom domain information and DNS instructions' })
  getCustomDomainInfo(@Param('id') id: string) {
    return this.companiesService.getCustomDomainInfo(id);
  }

  @Delete(':id/custom-domain')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove custom domain from company' })
  removeCustomDomain(@Param('id') id: string) {
    return this.companiesService.removeCustomDomain(id);
  }
}

