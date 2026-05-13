import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ _id: false })
class VariantOption {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  priceModifier: number;
}
const VariantOptionSchema = SchemaFactory.createForClass(VariantOption);

@Schema({ _id: true })
class Variant {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [VariantOptionSchema], default: [] })
  options: VariantOption[];
}
const VariantSchema = SchemaFactory.createForClass(Variant);

@Schema({ _id: false })
class SelectionOption {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  price: number;
}
const SelectionOptionSchema = SchemaFactory.createForClass(SelectionOption);

@Schema({ _id: true })
class Selection {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ['single', 'multi', 'optional'], default: 'single' })
  type: string;

  @Prop({ type: [SelectionOptionSchema], default: [] })
  options: SelectionOption[];
}
const SelectionSchema = SchemaFactory.createForClass(Selection);


@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  // Pricing
  @Prop({ required: true })
  price: number;

  @Prop()
  cost?: number;

  @Prop()
  margin?: number;

  // Variants & Modifiers
  @Prop({ type: [VariantSchema], default: [] })
  variants: Variant[];

  @Prop({
    type: [
      {
        name: String,
        price: Number,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  addons: Array<{
    name: string;
    price: number;
    isAvailable: boolean;
  }>;

  // Selections (for customization options)
  @Prop({ type: [SelectionSchema], default: [] })
  selections: Selection[];

  // Inventory
  @Prop({ default: false })
  trackInventory: boolean;

  @Prop({
    type: [
      {
        ingredientId: { type: Types.ObjectId, ref: 'Ingredient' },
        quantity: Number,
        unit: String,
      },
    ],
    default: [],
  })
  ingredients: Array<{
    ingredientId: Types.ObjectId;
    quantity: number;
    unit: string;
  }>;

  // Availability
  @Prop({ default: true })
  isAvailable: boolean;

  @Prop()
  availableFrom?: string;

  @Prop()
  availableTo?: string;

  @Prop({ type: [String], default: [] })
  availableDays: string[];

  // Nutrition
  @Prop({
    type: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      allergens: [String],
    },
  })
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };

  // Tags & Flags
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isNew: boolean;

  // Stats
  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalRevenue: number;

  @Prop()
  averageRating?: number;

  // Preparation
  @Prop()
  preparationTime?: number;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// Indexes
MenuItemSchema.index({ companyId: 1, branchId: 1 });
MenuItemSchema.index({ categoryId: 1 });
MenuItemSchema.index({ isAvailable: 1 });
MenuItemSchema.index({ tags: 1 });
MenuItemSchema.index({ name: 'text', description: 'text' });

// Calculate margin before save
MenuItemSchema.pre('save', function (next) {
  if (this.cost && this.price) {
    this.margin = ((this.price - this.cost) / this.price) * 100;
  }
  next();
});

// Transform output
MenuItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform
    ret.id = ret._id?.toString() || ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

MenuItemSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform
    ret.id = ret._id?.toString() || ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

