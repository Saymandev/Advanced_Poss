import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IngredientDocument = Ingredient & Document;

@Schema({ timestamps: true })
export class Ingredient {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  sku?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  image?: string;

  @Prop({
    type: String,
    enum: ['food', 'beverage', 'packaging', 'cleaning', 'other'],
    default: 'food',
  })
  category: string;

  @Prop({
    type: String,
    enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'bottle', 'can'],
    required: true,
  })
  unit: string;

  // Stock Management
  @Prop({ required: true, default: 0 })
  currentStock: number;

  @Prop({ required: true, default: 0 })
  minimumStock: number;

  @Prop({ default: 0 })
  maximumStock?: number;

  @Prop({ default: 0 })
  reorderPoint: number;

  @Prop({ default: 0 })
  reorderQuantity: number;

  // Pricing
  @Prop({ required: true })
  unitCost: number;

  @Prop()
  lastPurchasePrice?: number;

  @Prop()
  averageCost?: number;

  // Supplier
  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  preferredSupplierId?: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Supplier' }])
  alternativeSupplierIds?: Types.ObjectId[];

  // Storage
  @Prop()
  storageLocation?: string;

  @Prop()
  storageTemperature?: string;

  @Prop()
  shelfLife?: number; // in days

  // Tracking
  @Prop()
  lastRestockedDate?: Date;

  @Prop()
  lastUsedDate?: Date;

  @Prop({ default: 0 })
  totalPurchased: number;

  @Prop({ default: 0 })
  totalUsed: number;

  @Prop({ default: 0 })
  totalWastage: number;

  // Alerts
  @Prop({ default: false })
  isLowStock: boolean;

  @Prop({ default: false })
  isOutOfStock: boolean;

  @Prop({ default: false })
  needsReorder: boolean;

  // Status
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deactivatedAt?: Date;

  // Additional Info
  @Prop([String])
  tags?: string[];

  @Prop()
  notes?: string;

  @Prop()
  barcode?: string;
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);

// Indexes
IngredientSchema.index({ companyId: 1, branchId: 1 });
IngredientSchema.index({ companyId: 1, branchId: 1, name: 1 }, { unique: true });
IngredientSchema.index({ sku: 1 });
IngredientSchema.index({ category: 1 });
IngredientSchema.index({ isLowStock: 1 });
IngredientSchema.index({ isOutOfStock: 1 });
IngredientSchema.index({ needsReorder: 1 });
IngredientSchema.index({ isActive: 1 });

// Middleware to update stock alerts
IngredientSchema.pre('save', function (next) {
  // Check if out of stock
  this.isOutOfStock = this.currentStock <= 0;

  // Check if low stock
  this.isLowStock =
    this.currentStock > 0 && this.currentStock <= this.minimumStock;

  // Check if needs reorder
  this.needsReorder =
    this.reorderPoint > 0 && this.currentStock <= this.reorderPoint;

  next();
});

// Transform output
IngredientSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

