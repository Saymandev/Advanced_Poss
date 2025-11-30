import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { MarketingService } from './marketing.service';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('campaigns')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async create(
    @Body() createCampaignDto: CreateCampaignDto,
    @Req() req: any,
  ) {
    const companyId = req.user?.companyId || req.user?.company?._id;
    const branchId = req.user?.branchId || req.user?.branch?._id;
    const userId = req.user?.userId || req.user?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaign = await this.marketingService.create(
      createCampaignDto,
      companyId,
      branchId,
      userId,
    );

    return {
      success: true,
      data: campaign,
    };
  }

  @Get('campaigns')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findAll(@Query('branchId') branchId: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaigns = await this.marketingService.findAll(companyId, branchId);

    return {
      success: true,
      data: campaigns,
      count: campaigns.length,
    };
  }

  @Get('campaigns/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getStats(@Query('branchId') branchId: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const stats = await this.marketingService.getStats(companyId, branchId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaign = await this.marketingService.findOne(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Patch('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @Req() req: any,
  ) {
    const companyId = req.user?.companyId || req.user?.company?._id;
    const userId = req.user?.userId || req.user?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaign = await this.marketingService.update(
      id,
      updateCampaignDto,
      companyId,
      userId,
    );

    return {
      success: true,
      data: campaign,
    };
  }

  @Delete('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async remove(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    await this.marketingService.remove(id, companyId);

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  @Post('campaigns/:id/pause')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async pause(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaign = await this.marketingService.pause(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Post('campaigns/:id/resume')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async resume(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const campaign = await this.marketingService.resume(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Post('campaigns/:id/send')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async send(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const result = await this.marketingService.send(id, companyId);

    return {
      success: true,
      ...result,
    };
  }
}

