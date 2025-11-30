import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import {
  MarketingCampaign,
  MarketingCampaignSchema,
} from './schemas/marketing-campaign.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketingCampaign.name, schema: MarketingCampaignSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}

