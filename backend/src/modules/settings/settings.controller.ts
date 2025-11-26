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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CreateServiceChargeSettingDto,
} from './dto/create-service-charge-setting.dto';
import { CreateTaxSettingDto } from './dto/create-tax-setting.dto';
import {
  UpdateCompanySettingsDto,
} from './dto/update-company-settings.dto';
import {
  UpdateInvoiceSettingsRequestDto
} from './dto/update-invoice-settings.dto';
import {
  UpdateServiceChargeSettingDto,
} from './dto/update-service-charge-setting.dto';
import { UpdateTaxSettingDto } from './dto/update-tax-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get company level settings' })
  getCompanySettings(@Query('companyId') companyId: string) {
    return this.settingsService.getCompanySettings(companyId);
  }

  @Patch('company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update company level settings' })
  updateCompanySettings(
    @Body('companyId') companyId: string,
    @Body() payload: UpdateCompanySettingsDto,
  ) {
    return this.settingsService.updateCompanySettings(companyId, payload);
  }

  @Get('invoice')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get invoice settings' })
  getInvoiceSettings(@Query('companyId') companyId: string) {
    return this.settingsService.getInvoiceSettings(companyId);
  }

  @Patch('invoice')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update invoice settings' })
  updateInvoiceSettings(
    @Body() body: UpdateInvoiceSettingsRequestDto,
  ) {
    const { companyId, ...payload } = body;
    return this.settingsService.updateInvoiceSettings(companyId, payload);
  }

  @Get('taxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'List tax settings' })
  listTaxes(@Query('companyId') companyId: string) {
    return this.settingsService.listTaxSettings(companyId);
  }

  @Post('taxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create tax setting' })
  createTax(@Body() payload: CreateTaxSettingDto) {
    return this.settingsService.createTaxSetting(payload);
  }

  @Patch('taxes/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update tax setting' })
  updateTax(
    @Param('id') id: string,
    @Body() payload: UpdateTaxSettingDto,
  ) {
    return this.settingsService.updateTaxSetting(id, payload);
  }

  @Delete('taxes/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete tax setting' })
  deleteTax(@Param('id') id: string) {
    return this.settingsService.deleteTaxSetting(id);
  }

  @Get('service-charges')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'List service charge settings' })
  listServiceCharges(@Query('companyId') companyId: string) {
    return this.settingsService.listServiceChargeSettings(companyId);
  }

  @Post('service-charges')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create service charge setting' })
  createServiceCharge(@Body() payload: CreateServiceChargeSettingDto) {
    return this.settingsService.createServiceChargeSetting(payload);
  }

  @Patch('service-charges/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update service charge setting' })
  updateServiceCharge(
    @Param('id') id: string,
    @Body() payload: UpdateServiceChargeSettingDto,
  ) {
    return this.settingsService.updateServiceChargeSetting(id, payload);
  }

  @Delete('service-charges/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete service charge setting' })
  deleteServiceCharge(@Param('id') id: string) {
    return this.settingsService.deleteServiceChargeSetting(id);
  }
}

