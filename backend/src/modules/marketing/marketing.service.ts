import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  }> {
    const campaign = await this.findOne(id, companyId);

    if (campaign.status === 'completed') {
      throw new BadRequestException('Campaign has already been sent');
    }

    if (campaign.status === 'draft') {
      throw new BadRequestException('Cannot send a draft campaign. Please activate it first.');
    }

    // TODO: Implement actual sending logic (email, SMS, push notifications)
    // For now, just mark as sent
    const updated = await this.campaignModel
      .findByIdAndUpdate(
        id,
        {
          status: 'active',
          sentDate: new Date(),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(
      `Campaign ${id} marked as sent to ${updated.recipients} recipients`,
    );

    return {
      message: 'Campaign sent successfully',
      sent: updated.recipients,
    };
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
}

