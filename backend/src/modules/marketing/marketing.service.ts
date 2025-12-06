import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import {
  CreateCampaignDto,
} from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import {
  MarketingCampaign,
  MarketingCampaignDocument,
} from './schemas/marketing-campaign.schema';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectModel(MarketingCampaign.name)
    private campaignModel: Model<MarketingCampaignDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private emailService: EmailService,
    private smsService: SmsService,
    private configService: ConfigService,
  ) {}

  async create(
    createCampaignDto: CreateCampaignDto,
    companyId: string,
    branchId?: string,
    userId?: string,
  ): Promise<MarketingCampaign> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const campaignData: any = {
      ...createCampaignDto,
      companyId: new Types.ObjectId(companyId),
      status: createCampaignDto.scheduledDate ? 'scheduled' : 'draft',
    };

    if (branchId && Types.ObjectId.isValid(branchId)) {
      campaignData.branchId = new Types.ObjectId(branchId);
    }

    if (createCampaignDto.scheduledDate) {
      campaignData.scheduledDate = new Date(createCampaignDto.scheduledDate);
    }

    if (userId && Types.ObjectId.isValid(userId)) {
      campaignData.createdBy = new Types.ObjectId(userId);
    }

    // Calculate recipients based on target
    const recipients = await this.calculateRecipients(
      companyId,
      branchId,
      createCampaignDto.target,
      createCampaignDto.segment,
    );
    campaignData.recipients = recipients;

    const campaign = new this.campaignModel(campaignData);
    return campaign.save();
  }

  async findAll(
    companyId: string,
    branchId?: string,
  ): Promise<MarketingCampaign[]> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const query: any = { companyId: new Types.ObjectId(companyId) };

    if (branchId && Types.ObjectId.isValid(branchId)) {
      query.branchId = new Types.ObjectId(branchId);
    }

    const campaigns = await this.campaignModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    // Ensure id field is present (transform _id to id)
    return campaigns.map((campaign: any) => ({
      ...campaign,
      id: campaign._id?.toString() || campaign.id,
      _id: campaign._id?.toString() || campaign._id,
    }));
  }

  async findOne(id: string, companyId: string): Promise<MarketingCampaign> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid campaign ID');
    }
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const campaign = await this.campaignModel
      .findOne({
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(companyId),
      })
      .lean()
      .exec();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(
    id: string,
    updateCampaignDto: UpdateCampaignDto,
    companyId: string,
    userId?: string,
  ): Promise<MarketingCampaign> {
    const campaign = await this.findOne(id, companyId);

    const updateData: any = { ...updateCampaignDto };

    if (updateCampaignDto.scheduledDate) {
      updateData.scheduledDate = new Date(updateCampaignDto.scheduledDate);
      // Auto-update status if scheduled date is set
      if (!updateCampaignDto.status) {
        updateData.status = 'scheduled';
      }
    }

    if (userId && Types.ObjectId.isValid(userId)) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    // Recalculate recipients if target changed
    if (updateCampaignDto.target) {
      const recipients = await this.calculateRecipients(
        companyId,
        campaign.branchId?.toString(),
        updateCampaignDto.target,
        updateCampaignDto.segment || campaign.segment,
      );
      updateData.recipients = recipients;
    }

    const updated = await this.campaignModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    return updated;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const campaign = await this.findOne(id, companyId);
    await this.campaignModel.findByIdAndDelete(id).exec();
  }

  async pause(id: string, companyId: string): Promise<MarketingCampaign> {
    const campaign = await this.findOne(id, companyId);

    if (campaign.status === 'completed') {
      throw new BadRequestException('Cannot pause a completed campaign');
    }

    if (campaign.status === 'paused') {
      throw new BadRequestException('Campaign is already paused');
    }

    const updated = await this.campaignModel
      .findByIdAndUpdate(id, { status: 'paused' }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    return updated;
  }

  async resume(id: string, companyId: string): Promise<MarketingCampaign> {
    const campaign = await this.findOne(id, companyId);

    if (campaign.status === 'completed') {
      throw new BadRequestException('Cannot resume a completed campaign');
    }

    if (campaign.status === 'active') {
      throw new BadRequestException('Campaign is already active');
    }

    // If scheduled date is in the future, keep as scheduled
    let newStatus: 'active' | 'scheduled' = 'active';
    if (campaign.scheduledDate && new Date(campaign.scheduledDate) > new Date()) {
      newStatus = 'scheduled';
    }

    const updated = await this.campaignModel
      .findByIdAndUpdate(id, { status: newStatus }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    return updated;
  }

  async send(id: string, companyId: string): Promise<{
    message: string;
    sent: number;
    failed: number;
  }> {
    const campaign = await this.findOne(id, companyId);

    if (campaign.status === 'completed') {
      throw new BadRequestException('Campaign has already been sent');
    }

    if (campaign.status === 'draft') {
      throw new BadRequestException('Cannot send a draft campaign. Please activate it first.');
    }

    // Validate message length for SMS campaigns
    if (campaign.type === 'sms') {
      const maxSmsLength = 1600; // Maximum for concatenated SMS
      if (campaign.message.length > maxSmsLength) {
        throw new BadRequestException(
          `SMS message exceeds maximum length of ${maxSmsLength} characters. Current length: ${campaign.message.length}`,
        );
      }
      if (campaign.message.length > 160) {
        this.logger.warn(
          `SMS campaign ${id} message is ${campaign.message.length} characters. Will be sent as concatenated SMS.`,
        );
      }
    }

    // Get recipients based on campaign target
    const recipients = await this.getRecipients(
      companyId,
      campaign.branchId?.toString(),
      campaign.target,
      campaign.segment,
    );

    if (recipients.length === 0) {
      throw new BadRequestException('No recipients found for this campaign');
    }

    // Check if SMS service is enabled for SMS campaigns
    if (campaign.type === 'sms') {
      const smsEnabled = await this.smsService.isServiceEnabled();
      if (!smsEnabled) {
        throw new BadRequestException(
          'SMS service is not enabled. Please configure SMS settings in system settings.',
        );
      }
    }

    let sent = 0;
    let failed = 0;

    try {
      // Update campaign status to active before sending
      await this.campaignModel.findByIdAndUpdate(id, {
        status: 'active',
      }).exec();

      // Send based on campaign type
      if (campaign.type === 'email') {
        const frontendUrl = this.configService.get('frontend.url');
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?campaign=${id}&email={email}`;
        
        const emailRecipients = recipients
          .filter((r) => r.email)
          .map((r) => ({
            email: r.email!,
            name: `${r.firstName} ${r.lastName}`.trim(),
          }));

        const result = await this.emailService.sendBulkMarketingEmails(
          emailRecipients,
          campaign.subject || 'Marketing Campaign',
          campaign.message,
          undefined, // Company name could be fetched if needed
          unsubscribeUrl,
        );

        sent = result.sent;
        failed = result.failed;

        // Note: Stats will be updated via tracking endpoints

      } else if (campaign.type === 'sms') {
        const smsRecipients = recipients
          .filter((r) => r.phone)
          .map((r) => r.phone!);

        const result = await this.smsService.sendBulkSms(
          smsRecipients,
          campaign.message,
        );

        sent = result.sent;
        failed = result.failed;

      } else if (campaign.type === 'push') {
        // Push notifications would require a push notification service
        this.logger.warn('Push notification campaigns are not yet implemented');
        throw new BadRequestException('Push notification campaigns are not yet supported');
      } else if (campaign.type === 'loyalty' || campaign.type === 'coupon') {
        // Loyalty and coupon campaigns might need different handling
        // For now, send as email if email exists
        const emailRecipients = recipients
          .filter((r) => r.email)
          .map((r) => ({
            email: r.email!,
            name: `${r.firstName} ${r.lastName}`.trim(),
          }));

        if (emailRecipients.length > 0) {
          const result = await this.emailService.sendBulkMarketingEmails(
            emailRecipients,
            campaign.subject || 'Special Offer',
            campaign.message,
          );
          sent = result.sent;
          failed = result.failed;
        }
      }

      // Update campaign status and stats
      const updateData: any = {
        sentDate: new Date(),
        recipients: sent + failed, // Total recipients attempted
      };

      // Only mark as completed if at least some messages were sent
      // If all failed, keep as paused for retry
      if (sent > 0) {
        updateData.status = 'completed';
      } else {
        updateData.status = 'paused';
        this.logger.warn(`Campaign ${id} failed to send to all recipients. Status set to paused.`);
      }

      const updated = await this.campaignModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true },
      ).lean().exec();

      if (!updated) {
        throw new NotFoundException('Campaign not found');
      }

      this.logger.log(
        `Campaign ${id} (${campaign.name}) sent: ${sent} successful, ${failed} failed out of ${recipients.length} recipients`,
      );

      return {
        message: sent > 0
          ? `Campaign sent successfully. ${sent} delivered, ${failed} failed.`
          : `Campaign failed to send. All ${failed} attempts failed. Campaign paused for review.`,
        sent,
        failed,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send campaign ${id}:`, error);
      
      // Update campaign with error status only if it's not already paused
      try {
        await this.campaignModel.findByIdAndUpdate(
          id,
          { status: 'paused' },
          { new: true },
        ).exec();
      } catch (updateError) {
        this.logger.error(`Failed to update campaign ${id} status after error:`, updateError);
      }

      // Re-throw BadRequestException as-is, wrap others
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to send campaign: ${error.message || 'Unknown error'}`,
      );
    }
  }

  private async getRecipients(
    companyId: string,
    branchId?: string,
    target?: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment',
    segment?: string,
  ): Promise<Array<{ email?: string; phone?: string; firstName: string; lastName: string }>> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    };

    // Filter by branch
    if (branchId && Types.ObjectId.isValid(branchId)) {
      const branchObjectId = new Types.ObjectId(branchId);
      query.$or = [
        { branchId: branchObjectId },
        { branchId: { $exists: false } },
        { branchId: null },
      ];
    }

    // Filter by target audience
    if (target === 'loyalty') {
      query.loyaltyPoints = { $gt: 0 };
    } else if (target === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.firstOrderDate = { $gte: thirtyDaysAgo };
    } else if (target === 'inactive') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      query.$or = [
        { lastOrderDate: { $lt: ninetyDaysAgo } },
        { lastOrderDate: { $exists: false } },
      ];
    } else if (target === 'segment' && segment) {
      query.tags = { $in: [segment] };
    }

    const customers = await this.customerModel
      .find(query)
      .select('email phone firstName lastName')
      .lean()
      .exec();

    return customers.map((c: any) => ({
      email: c.email,
      phone: c.phone,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
    }));
  }

  private async calculateRecipients(
    companyId: string,
    branchId?: string,
    target?: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment',
    segment?: string,
  ): Promise<number> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    };

    // Filter by branch
    if (branchId && Types.ObjectId.isValid(branchId)) {
      const branchObjectId = new Types.ObjectId(branchId);
      query.$or = [
        { branchId: branchObjectId },
        { branchId: { $exists: false } },
        { branchId: null },
      ];
    }

    // Filter by target audience
    if (target === 'loyalty') {
      query.loyaltyPoints = { $gt: 0 };
    } else if (target === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.firstOrderDate = { $gte: thirtyDaysAgo };
    } else if (target === 'inactive') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      query.$or = [
        { lastOrderDate: { $lt: ninetyDaysAgo } },
        { lastOrderDate: { $exists: false } },
      ];
    } else if (target === 'segment' && segment) {
      // For custom segments, you could add segment tags to customers
      query.tags = { $in: [segment] };
    }

    const count = await this.customerModel.countDocuments(query).exec();
    return count;
  }

  async getStats(companyId: string, branchId?: string): Promise<{
    total: number;
    active: number;
    scheduled: number;
    completed: number;
    paused: number;
    draft: number;
  }> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company ID');
    }

    const query: any = { companyId: new Types.ObjectId(companyId) };

    if (branchId && Types.ObjectId.isValid(branchId)) {
      query.branchId = new Types.ObjectId(branchId);
    }

    const [total, active, scheduled, completed, paused, draft] =
      await Promise.all([
        this.campaignModel.countDocuments(query).exec(),
        this.campaignModel
          .countDocuments({ ...query, status: 'active' })
          .exec(),
        this.campaignModel
          .countDocuments({ ...query, status: 'scheduled' })
          .exec(),
        this.campaignModel
          .countDocuments({ ...query, status: 'completed' })
          .exec(),
        this.campaignModel
          .countDocuments({ ...query, status: 'paused' })
          .exec(),
        this.campaignModel
          .countDocuments({ ...query, status: 'draft' })
          .exec(),
      ]);

    return {
      total,
      active,
      scheduled,
      completed,
      paused,
      draft,
    };
  }

  async trackOpen(campaignId: string, email?: string): Promise<void> {
    try {
      const campaign = await this.campaignModel.findById(campaignId).exec();
      if (!campaign) {
        this.logger.warn(`Campaign ${campaignId} not found for open tracking`);
        return;
      }

      // Increment opened count (deduplication would require storing individual opens)
      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { opened: 1 },
      }).exec();

      this.logger.debug(`Tracked open for campaign ${campaignId}${email ? ` from ${email}` : ''}`);
    } catch (error: any) {
      this.logger.error(`Failed to track open for campaign ${campaignId}:`, error);
    }
  }

  async trackClick(campaignId: string, email?: string, url?: string): Promise<void> {
    try {
      const campaign = await this.campaignModel.findById(campaignId).exec();
      if (!campaign) {
        this.logger.warn(`Campaign ${campaignId} not found for click tracking`);
        return;
      }

      // Increment clicked count
      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { clicked: 1 },
      }).exec();

      this.logger.debug(
        `Tracked click for campaign ${campaignId}${email ? ` from ${email}` : ''}${url ? ` to ${url}` : ''}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to track click for campaign ${campaignId}:`, error);
    }
  }

  async trackConversion(campaignId: string): Promise<void> {
    try {
      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { converted: 1 },
      }).exec();

      this.logger.debug(`Tracked conversion for campaign ${campaignId}`);
    } catch (error: any) {
      this.logger.error(`Failed to track conversion for campaign ${campaignId}:`, error);
    }
  }

  async getAnalytics(
    campaignId: string,
    companyId: string,
  ): Promise<{
    campaign: MarketingCampaign;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }> {
    const campaign = await this.findOne(campaignId, companyId);

    const openRate = campaign.recipients > 0
      ? (campaign.opened / campaign.recipients) * 100
      : 0;
    const clickRate = campaign.recipients > 0
      ? (campaign.clicked / campaign.recipients) * 100
      : 0;
    const conversionRate = campaign.recipients > 0
      ? (campaign.converted / campaign.recipients) * 100
      : 0;

    return {
      campaign,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}

