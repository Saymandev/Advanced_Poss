import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true })
  code: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  logo?: string;

  @Prop({
    type: String,
    enum: ['food', 'beverage', 'equipment', 'packaging', 'service', 'other'],
    default: 'food',
  })
  type: string;

  // Contact Information
  @Prop({ required: true })
  contactPerson: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  alternatePhone?: string;

  @Prop()
  website?: string;

  // Address
  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    required: true,
  })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Business Details
  @Prop()
  taxId?: string;

  @Prop()
  registrationNumber?: string;

  @Prop({
    type: String,
    enum: ['net-7', 'net-15', 'net-30', 'net-60', 'cod', 'prepaid'],
    default: 'net-30',
  })
  paymentTerms: string;

  @Prop()
  creditLimit?: number;

  @Prop({ default: 0 })
  currentBalance: number;

  // Bank Details
  @Prop({
    type: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      ifscCode: String,
      swiftCode: String,
    },
  })
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    ifscCode?: string;
    swiftCode?: string;
  };

  // Product Categories
  @Prop([String])
  productCategories?: string[];

  // Statistics
  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalPurchases: number;

  @Prop()
  lastOrderDate?: Date;

  @Prop()
  firstOrderDate?: Date;

  // Rating & Performance
  @Prop({ default: 5, min: 1, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  onTimeDeliveryRate: number; // percentage

  @Prop({ default: 0 })
  qualityScore: number; // percentage

  @Prop([String])
  certifications?: string[];

  @Prop()
  notes?: string;

  @Prop([String])
  tags?: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPreferred: boolean;

  @Prop()
  deactivatedAt?: Date;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Indexes
SupplierSchema.index({ companyId: 1 });
SupplierSchema.index({ code: 1 }, { unique: true });
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ email: 1 });
SupplierSchema.index({ type: 1 });
SupplierSchema.index({ isActive: 1 });
SupplierSchema.index({ isPreferred: 1 });

// Auto-generate supplier code
SupplierSchema.pre('save', async function (next) {
  if (!this.code) {
    // @ts-ignore - Mongoose model constructor
    const count = await this.constructor.countDocuments({});
    this.code = `SUP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Transform output
SupplierSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

