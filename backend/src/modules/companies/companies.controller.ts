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
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CompaniesService } from './companies.service';
import { AddCustomDomainDto } from './dto/add-custom-domain.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { VerifyCustomDomainDto } from './dto/verify-custom-domain.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.SETTINGS)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @ApiOperation({ summary: 'Create new company' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll(@Query('ownerId') ownerId?: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can access all companies');
    }
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
    return this.companiesService.findAll(filter);
  }

  @Get('my-companies')
  @ApiOperation({ summary: 'Get current user companies' })
  getMyCompanies(@CurrentUser('id') userId: string) {
    return this.companiesService.findByOwner(userId);
  }

  @Get('system/stats')
  @ApiOperation({ summary: 'Get system-wide statistics (Super Admin only)' })
  getSystemStats(@CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can access system stats');
    }
    return this.companiesService.getSystemStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get company statistics' })
  getStats(@Param('id') id: string) {
    return this.companiesService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.companiesService.updateSettings(id, settings);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can delete companies');
    }
    return this.companiesService.remove(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate company' })
  deactivate(@Param('id') id: string) {
    return this.companiesService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate company (Super Admin only)' })
  activate(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can activate companies');
    }
    return this.companiesService.activate(id);
  }

  @Post(':id/custom-domain')
  @ApiOperation({ summary: 'Add custom domain to company' })
  addCustomDomain(@Param('id') id: string, @Body() addDomainDto: AddCustomDomainDto) {
    return this.companiesService.addCustomDomain(id, addDomainDto);
  }

  @Post(':id/custom-domain/verify')
  @ApiOperation({ summary: 'Verify custom domain ownership' })
  verifyCustomDomain(@Param('id') id: string, @Body() verifyDto: VerifyCustomDomainDto) {
    return this.companiesService.verifyCustomDomain(id, verifyDto);
  }

  @Get(':id/custom-domain')
  @ApiOperation({ summary: 'Get custom domain information and DNS instructions' })
  getCustomDomainInfo(@Param('id') id: string) {
    return this.companiesService.getCustomDomainInfo(id);
  }

  @Delete(':id/custom-domain')
  @ApiOperation({ summary: 'Remove custom domain from company' })
  removeCustomDomain(@Param('id') id: string) {
    return this.companiesService.removeCustomDomain(id);
  }
}

