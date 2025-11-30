import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RolePermissionDocument = RolePermission & Document;

@Schema({ timestamps: true })
export class RolePermission {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['owner', 'manager', 'chef', 'waiter', 'cashier'],
    required: true,
  })
  role: string;

  @Prop({ type: [String], default: [] })
  features: string[]; // Array of feature IDs

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);

// Compound unique index: one permission set per role per company
RolePermissionSchema.index({ companyId: 1, role: 1 }, { unique: true });

// Transform output
RolePermissionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

