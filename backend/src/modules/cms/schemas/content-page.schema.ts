import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContentPageDocument = ContentPage & Document;

export enum ContentPageType {
  BLOG = 'blog',
  CAREER = 'career',
  HELP_CENTER = 'help_center',
  PAGE = 'page', // Generic page
}

export enum ContentPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class ContentPage {
  @Prop({
    type: String,
    enum: ContentPageType,
    required: true,
    index: true,
  })
  type: ContentPageType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  slug: string;

  @Prop({ trim: true })
  excerpt?: string;

  @Prop({ required: true })
  content: string; // HTML or Markdown content

  @Prop()
  featuredImage?: string;

  @Prop([String])
  images?: string[];

  @Prop([String])
  tags?: string[];

  @Prop({
    type: String,
    enum: ContentPageStatus,
    default: ContentPageStatus.DRAFT,
    index: true,
  })
  status: ContentPageStatus;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: Date })
  publishedAt?: Date;

  // For blog posts
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId?: Types.ObjectId;

  @Prop()
  authorName?: string;

  @Prop()
  readingTime?: number; // in minutes

  // For career posts
  @Prop()
  jobTitle?: string;

  @Prop()
  location?: string;

  @Prop()
  employmentType?: string; // full-time, part-time, contract, etc.

  @Prop()
  salaryRange?: string;

  @Prop()
  applicationDeadline?: Date;

  @Prop()
  applicationUrl?: string;

  @Prop()
  requirements?: string[];

  @Prop()
  responsibilities?: string[];

  // For help center articles
  @Prop()
  category?: string;

  @Prop()
  subcategory?: string;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: 0 })
  notHelpfulCount: number;

  @Prop({ default: true })
  allowComments: boolean;

  // SEO
  @Prop()
  metaTitle?: string;

  @Prop()
  metaDescription?: string;

  @Prop([String])
  metaKeywords?: string[];

  // Ordering
  @Prop({ default: 0 })
  sortOrder: number;

  // Created/Updated by
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const ContentPageSchema = SchemaFactory.createForClass(ContentPage);

// Indexes for better query performance
ContentPageSchema.index({ type: 1, status: 1, publishedAt: -1 });
ContentPageSchema.index({ slug: 1, type: 1 });
ContentPageSchema.index({ tags: 1 });
ContentPageSchema.index({ createdAt: -1 });

