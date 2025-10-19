import {
    Body,
    Controller,
    Get,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@CurrentUser('companyId') companyId: string) {
    return this.companyService.getSettings(companyId);
  }

  @Patch('settings')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(
    @CurrentUser('companyId') companyId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.updateSettings(companyId, updateCompanyDto);
  }

  @Post('upload-logo')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
