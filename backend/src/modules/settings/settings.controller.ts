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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CreateServiceChargeSettingDto,
} from './dto/create-service-charge-setting.dto';
import { CreateTaxSettingDto } from './dto/create-tax-setting.dto';
import {
  UpdateCompanySettingsRequestDto
} from './dto/update-company-settings.dto';
import {
  UpdateInvoiceSettingsRequestDto
} from './dto/update-invoice-settings.dto';
import {
  UpdateServiceChargeSettingDto,
} from './dto/update-service-charge-setting.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { UpdateTaxSettingDto } from './dto/update-tax-setting.dto';
import { LoginSecurityService } from './login-security.service';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.SETTINGS)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly loginSecurityService: LoginSecurityService,
  ) { }

  @Get('company')
  @ApiOperation({ summary: 'Get company level settings' })
  getCompanySettings(@Query('companyId') companyId: string) {
    return this.settingsService.getCompanySettings(companyId);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Update company level settings' })
  updateCompanySettings(
    @Body() body: UpdateCompanySettingsRequestDto,
  ) {
    const { companyId, ...payload } = body;
    return this.settingsService.updateCompanySettings(companyId, payload);
  }

  @Get('invoice')
  @ApiOperation({ summary: 'Get invoice settings' })
  getInvoiceSettings(@Query('companyId') companyId: string) {
    return this.settingsService.getInvoiceSettings(companyId);
  }

  @Patch('invoice')
  @ApiOperation({ summary: 'Update invoice settings' })
  updateInvoiceSettings(
    @Body() body: UpdateInvoiceSettingsRequestDto,
  ) {
    const { companyId, ...payload } = body;
    return this.settingsService.updateInvoiceSettings(companyId, payload);
  }

  @Get('taxes')
  @ApiOperation({ summary: 'List tax settings' })
  listTaxes(@Query('companyId') companyId: string) {
    return this.settingsService.listTaxSettings(companyId);
  }

  @Post('taxes')
  @ApiOperation({ summary: 'Create tax setting' })
  createTax(@Body() payload: CreateTaxSettingDto) {
    return this.settingsService.createTaxSetting(payload);
  }

  @Patch('taxes/:id')
  @ApiOperation({ summary: 'Update tax setting' })
  updateTax(
    @Param('id') id: string,
    @Body() payload: UpdateTaxSettingDto,
  ) {
    return this.settingsService.updateTaxSetting(id, payload);
  }

  @Delete('taxes/:id')
  @ApiOperation({ summary: 'Delete tax setting' })
  deleteTax(@Param('id') id: string) {
    return this.settingsService.deleteTaxSetting(id);
  }

  @Get('service-charges')
  @ApiOperation({ summary: 'List service charge settings' })
  listServiceCharges(@Query('companyId') companyId: string) {
    return this.settingsService.listServiceChargeSettings(companyId);
  }

  @Post('service-charges')
  @ApiOperation({ summary: 'Create service charge setting' })
  createServiceCharge(@Body() payload: CreateServiceChargeSettingDto) {
    return this.settingsService.createServiceChargeSetting(payload);
  }

  @Patch('service-charges/:id')
  @ApiOperation({ summary: 'Update service charge setting' })
  updateServiceCharge(
    @Param('id') id: string,
    @Body() payload: UpdateServiceChargeSettingDto,
  ) {
    return this.settingsService.updateServiceChargeSetting(id, payload);
  }

  @Delete('service-charges/:id')
  @ApiOperation({ summary: 'Delete service charge setting' })
  deleteServiceCharge(@Param('id') id: string) {
    return this.settingsService.deleteServiceChargeSetting(id);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system-wide settings (Super Admin only)' })
  async getSystemSettings(@Request() req: any) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can access system-wide settings');
    }
    // This will automatically migrate to BD defaults if needed
    return this.settingsService.getSystemSettings();
  }

  @Patch('system')
  @ApiOperation({ summary: 'Update system-wide settings (Super Admin only)' })
  async updateSystemSettings(@Body() payload: UpdateSystemSettingsDto, @Request() req: any) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can access system-wide settings');
    }
    const updated = await this.settingsService.updateSystemSettings(payload);
    // Clear cache in LoginSecurityService to pick up new settings immediately
    this.loginSecurityService.clearCache();
    return updated;
  }
}

