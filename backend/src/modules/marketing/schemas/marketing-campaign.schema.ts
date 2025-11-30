import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MarketingCampaignDocument = MarketingCampaign & Document;

@Schema({ timestamps: true })
export class MarketingCampaign {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: ['email', 'sms', 'push', 'loyalty', 'coupon'],
    required: true,
  })
  type: 'email' | 'sms' | 'push' | 'loyalty' | 'coupon';

  @Prop({
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'paused'],
    default: 'draft',
  })
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';

  @Prop({
    type: String,
    enum: ['all', 'loyalty', 'new', 'inactive', 'segment'],
    required: true,
  })
  target: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment';

  @Prop({ trim: true })
  segment?: string;

  @Prop({ trim: true })
  subject?: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  scheduledDate?: Date;

  @Prop()
  sentDate?: Date;

  // Statistics
  @Prop({ default: 0 })
  recipients: number;

  @Prop({ default: 0 })
  opened: number;

  @Prop({ default: 0 })
  clicked: number;

  @Prop({ default: 0 })
  converted: number;

  // Metadata
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const MarketingCampaignSchema = SchemaFactory.createForClass(MarketingCampaign);

// Indexes
MarketingCampaignSchema.index({ companyId: 1 });
MarketingCampaignSchema.index({ branchId: 1 });
MarketingCampaignSchema.index({ companyId: 1, branchId: 1 });
MarketingCampaignSchema.index({ status: 1 });
MarketingCampaignSchema.index({ type: 1 });
MarketingCampaignSchema.index({ scheduledDate: 1 });
MarketingCampaignSchema.index({ createdAt: -1 });

// Transform output
MarketingCampaignSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

