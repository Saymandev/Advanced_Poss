import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionRemindersService } from './subscription-reminders.service';

@ApiTags('subscription-management')
@Controller('subscription-management')
export class SubscriptionManagementController {
  constructor(
    private subscriptionRemindersService: SubscriptionRemindersService,
    private paymentsService: PaymentsService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptionStatus(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.subscriptionRemindersService.checkCompanySubscription(companyId);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Upgrade initiated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upgradeSubscription(
    @Req() req: any,
    @Body('planName') planName: string,
  ) {
    const companyId = req.user.companyId;
    
    // Create checkout session for upgrade
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;

    return this.paymentsService.createCheckoutSession(
      companyId,
      planName,
      successUrl,
      cancelUrl,
    );
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate expired account' })
  @ApiResponse({ status: 200, description: 'Account reactivation initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async reactivateAccount(
    @Req() req: any,
    @Body('planName') planName: string,
  ) {
    const companyId = req.user.companyId;
    
    // Create checkout session for reactivation
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;

    return this.paymentsService.createCheckoutSession(
      companyId,
      planName,
      successUrl,
      cancelUrl,
    );
  }

  @Get('check/:companyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check specific company subscription (Admin only)' })
  @ApiResponse({ status: 200, description: 'Company subscription status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async checkCompanySubscription(@Param('companyId') companyId: string) {
    return this.subscriptionRemindersService.checkCompanySubscription(companyId);
  }
}
