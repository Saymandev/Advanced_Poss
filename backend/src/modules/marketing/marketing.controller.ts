import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FEATURES } from '../../common/constants/features.constants';
import { Public } from '../../common/decorators/public.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { MarketingService } from './marketing.service';

@Controller('marketing')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.MARKETING)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) { }

  @Post('campaigns')
  async create(
    @Body() createCampaignDto: CreateCampaignDto,
    @Req() req: any,
  ) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can create campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;
    const branchId = req.user?.branchId || req.user?.branch?._id;
    const userId = req.user?.userId || req.user?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
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
  async findAll(@Query('branchId') branchId: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const campaigns = await this.marketingService.findAll(companyId, branchId);

    return {
      success: true,
      data: campaigns,
      count: campaigns.length,
    };
  }

  @Get('campaigns/stats')
  async getStats(@Query('branchId') branchId: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const stats = await this.marketingService.getStats(companyId, branchId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('campaigns/:id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const campaign = await this.marketingService.findOne(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Patch('campaigns/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @Req() req: any,
  ) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;
    const userId = req.user?.userId || req.user?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
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
  async remove(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can delete campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    await this.marketingService.remove(id, companyId);

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  @Post('campaigns/:id/pause')
  async pause(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can pause campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const campaign = await this.marketingService.pause(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Post('campaigns/:id/resume')
  async resume(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can resume campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const campaign = await this.marketingService.resume(id, companyId);

    return {
      success: true,
      data: campaign,
    };
  }

  @Post('campaigns/:id/send')
  async send(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can send campaigns');
    }
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const result = await this.marketingService.send(id, companyId);

    return {
      success: true,
      ...result,
    };
  }

  @Get('campaigns/:id/track/open')
  @Public()
  async trackOpen(@Param('id') id: string, @Res() res: any, @Query('email') email?: string) {
    await this.marketingService.trackOpen(id, email);
    // Return 1x1 transparent pixel for email tracking
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    return res.send(pixel);
  }

  @Get('campaigns/:id/track/click')
  @Public()
  async trackClick(
    @Param('id') id: string,
    @Res() res: any,
    @Query('email') email?: string,
    @Query('url') url?: string,
  ) {
    await this.marketingService.trackClick(id, email, url);
    // Redirect to the target URL
    if (url) {
      return res.redirect(decodeURIComponent(url));
    }
    return res.status(200).json({ success: true });
  }

  @Get('campaigns/:id/analytics')
  async getAnalytics(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId || req.user?.company?._id;

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const analytics = await this.marketingService.getAnalytics(id, companyId);

    return {
      success: true,
      data: analytics,
    };
  }
}

