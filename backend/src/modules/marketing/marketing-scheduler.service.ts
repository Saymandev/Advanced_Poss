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

      for (const campaign of campaignsToSend) {
        try {
          const companyId = campaign.companyId.toString();
          this.logger.log(`Sending scheduled campaign: ${campaign.name} (${campaign._id})`);
          
          await this.marketingService.send(campaign._id.toString(), companyId);
          
          this.logger.log(`Successfully sent scheduled campaign: ${campaign.name}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to send scheduled campaign ${campaign._id}:`,
            error.message || error,
          );
          // Campaign status will be updated to 'paused' by the send method on error
        }
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled campaign processor:', error);
    }
  }
}

