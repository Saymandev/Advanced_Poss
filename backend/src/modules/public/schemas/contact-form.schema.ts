import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContactFormDocument = ContactForm & Document;

@Schema({ timestamps: true })
export class ContactForm {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
    index: true,
  })
  status: string;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  readBy?: Types.ObjectId;

  @Prop()
  adminNotes?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ContactFormSchema = SchemaFactory.createForClass(ContactForm);

// Indexes
ContactFormSchema.index({ companyId: 1, createdAt: -1 });
ContactFormSchema.index({ status: 1, createdAt: -1 });
ContactFormSchema.index({ email: 1 });

// Transform output
ContactFormSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const result = ret as any;
    result.id = result._id?.toString() || result._id;
    delete result._id;
    delete result.__v;
    return result;
  },
});

