import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketingCampaign, MarketingCampaignDocument } from './schemas/marketing-campaign.schema';
import { MarketingService } from './marketing.service';

@Injectable()
export class MarketingSchedulerService {
  private readonly logger = new Logger(MarketingSchedulerService.name);

  constructor(
    @InjectModel(MarketingCampaign.name)
    private campaignModel: Model<MarketingCampaignDocument>,
    private marketingService: MarketingService,
  ) {}

  /**
   * Check for scheduled campaigns every minute
   * and send them if their scheduled date has arrived
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledCampaigns() {
    try {
      const now = new Date();
      
      // Find campaigns that are scheduled and their scheduled date has passed
      const campaignsToSend = await this.campaignModel
        .find({
          status: 'scheduled',
          scheduledDate: { $lte: now },
        })
        .lean()
        .exec();

      if (campaignsToSend.length === 0) {
        return;
      }

      this.logger.log(`Found ${campaignsToSend.length} scheduled campaign(s) to send`);

      // Process campaigns sequentially to avoid overwhelming the email/SMS services
      for (const campaign of campaignsToSend) {
        try {
          const companyId = campaign.companyId.toString();
          this.logger.log(`Sending scheduled campaign: ${campaign.name} (${campaign._id})`);
          
          const result = await this.marketingService.send(campaign._id.toString(), companyId);
          
          this.logger.log(
            `Successfully sent scheduled campaign: ${campaign.name} - ${result.sent} sent, ${result.failed} failed`,
          );
          
          // Add a small delay between campaigns to avoid rate limiting
          if (campaignsToSend.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to send scheduled campaign ${campaign._id} (${campaign.name}):`,
            error.message || error,
          );
          // Campaign status will be updated to 'paused' by the send method on error
          // Continue with next campaign instead of stopping
        }
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled campaign processor:', error);
    }
  }
}

