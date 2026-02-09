import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.SETTINGS)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@CurrentUser('companyId') companyId: string) {
    return this.companyService.getSettings(companyId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(
    @CurrentUser('companyId') companyId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Managers and Owners can update settings');
    }
    return this.companyService.updateSettings(companyId, updateCompanyDto);
  }

  @Post('upload-logo')
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Managers and Owners can upload logo');
    }
    return this.companyService.uploadLogo(companyId, file);
  }

  @Get('qr-code')
  @ApiOperation({ summary: 'Get QR code for online ordering' })
  getQRCode(@CurrentUser('companyId') companyId: string) {
    return this.companyService.generateQRCode(companyId);
  }

  @Get('online-url')
  @ApiOperation({ summary: 'Get online ordering URL' })
  getOnlineUrl(@CurrentUser('companyId') companyId: string) {
    return this.companyService.getOnlineUrl(companyId);
  }
}
