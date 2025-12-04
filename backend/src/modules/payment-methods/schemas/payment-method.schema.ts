import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentMethodDocument = PaymentMethod & Document;

@Schema({ timestamps: true })
export class PaymentMethod {
  // For system-wide payment methods (managed by super admin)
  @Prop({ type: Types.ObjectId, ref: 'Company', required: false })
  companyId?: Types.ObjectId; // null/undefined = system-wide, set = company-specific

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId; // Optional: branch-specific payment methods

  @Prop({ required: true, trim: true })
  name: string; // e.g., "Cash", "VISA", "bKash"

  @Prop({ required: true, trim: true })
  code: string; // e.g., "cash", "visa", "bkash" (unique per scope)

  @Prop({ trim: true })
  displayName?: string; // e.g., "Cash Payment" or "VISA Card"

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: [
      'cash',
      'card',
      'mobile_wallet',
      'bank_transfer',
      'due',
      'complimentary',
      'other',
    ],
    default: 'other',
  })
  type: string; // Categorization for UI grouping

  @Prop({ trim: true })
  icon?: string; // Icon name or URL

  @Prop({ trim: true })
  color?: string; // Hex color for UI display

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number; // Display order

  // Settings
  @Prop({ default: false })
  requiresReference: boolean; // Whether transaction reference is required

  @Prop({ default: false })
  requiresAuthorization: boolean; // Whether authorization code is required

  @Prop({ default: false })
  allowsPartialPayment: boolean; // Can be used in split payments

  @Prop({ default: true })
  allowsChangeDue: boolean; // For cash payments, allows change calculation

  @Prop({ type: Object })
  metadata?: {
    // Card-specific
    cardType?: string; // 'credit', 'debit', 'both'
    supportedNetworks?: string[]; // ['visa', 'mastercard', 'amex']
    // Mobile wallet-specific
    provider?: string; // 'bkash', 'nagad', 'rocket', 'upay'
    accountNumber?: string; // Merchant account number
    // Other custom fields
    [key: string]: any;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

// Indexes
PaymentMethodSchema.index({ companyId: 1 });
PaymentMethodSchema.index({ branchId: 1 });
PaymentMethodSchema.index({ code: 1, companyId: 1 }, { unique: true, sparse: true });
PaymentMethodSchema.index({ isActive: 1, companyId: 1 });
PaymentMethodSchema.index({ sortOrder: 1 });

// Transform output
PaymentMethodSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

