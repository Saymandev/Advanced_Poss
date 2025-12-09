import {
    IsArray,
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';
import { BackupScope, BackupType } from '../schemas/backup.schema';

export class CreateBackupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BackupType)
  @IsOptional()
  type?: BackupType;

  @IsEnum(BackupScope)
  @IsNotEmpty()
  scope: BackupScope;

  @IsMongoId()
  @IsOptional()
  companyId?: MongooseSchema.Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  branchId?: MongooseSchema.Types.ObjectId;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  collections?: string[];
}

