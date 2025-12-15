import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

