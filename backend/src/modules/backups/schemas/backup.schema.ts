import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BackupDocument = Backup & Document;

export enum BackupType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  SCHEDULED = 'scheduled',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RESTORING = 'restoring',
  RESTORED = 'restored',
}

export enum BackupScope {
  FULL = 'full',
  COMPANY = 'company',
  BRANCH = 'branch',
  COLLECTION = 'collection',
}

@Schema({ timestamps: true })
export class Backup {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: BackupType, default: BackupType.MANUAL })
  type: BackupType;

  @Prop({ required: true, enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Prop({ required: true, enum: BackupScope, default: BackupScope.FULL })
  scope: BackupScope;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company' })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: [String], default: [] })
  collections: string[];

  @Prop()
  filePath: string;

  @Prop()
  fileName: string;

  @Prop({ default: 0 })
  fileSize: number; // in bytes

  @Prop()
  cloudUrl: string; // Cloud storage URL

  @Prop()
  checksum: string; // File checksum for integrity

  @Prop({ type: Date })
  startedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ default: 0 })
  duration: number; // in milliseconds

  @Prop()
  error: string;

  @Prop({ type: Object })
  metadata: {
    totalDocuments?: number;
    collections?: Array<{
      name: string;
      documentCount: number;
      size: number;
    }>;
    databaseSize?: number;
    indexes?: number;
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  expiresAt: Date;

  @Prop({ default: false })
  isEncrypted: boolean;

  @Prop({ default: false })
  isCompressed: boolean;

  @Prop({ type: Date })
  restoredAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  restoredBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const BackupSchema = SchemaFactory.createForClass(Backup);

// Indexes
BackupSchema.index({ status: 1 });
BackupSchema.index({ type: 1 });
BackupSchema.index({ companyId: 1 });
BackupSchema.index({ createdAt: -1 });
BackupSchema.index({ expiresAt: 1 });

// Virtual for formatted file size
BackupSchema.virtual('formattedSize').get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for formatted duration
BackupSchema.virtual('formattedDuration').get(function () {
  const ms = this.duration;
  if (ms === 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for is expired
BackupSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
});

BackupSchema.set('toJSON', { virtuals: true });
BackupSchema.set('toObject', { virtuals: true });

