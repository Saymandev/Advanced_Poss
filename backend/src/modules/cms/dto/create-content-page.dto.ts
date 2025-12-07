import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';
import { ContentPageStatus, ContentPageType } from '../schemas/content-page.schema';

export class CreateContentPageDto {
  @IsEnum(ContentPageType)
  type: ContentPageType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUrl()
  featuredImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ContentPageStatus)
  status?: ContentPageStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // Blog specific
  @ValidateIf((o) => o.type === ContentPageType.BLOG)
  @IsOptional()
  @IsString()
  authorName?: string;

  @ValidateIf((o) => o.type === ContentPageType.BLOG)
  @IsOptional()
  @IsNumber()
  @Min(1)
  readingTime?: number;

  // Career specific
  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsString()
  location?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsUrl()
  applicationUrl?: string;

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ValidateIf((o) => o.type === ContentPageType.CAREER)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  // Help center specific
  @ValidateIf((o) => o.type === ContentPageType.HELP_CENTER)
  @IsOptional()
  @IsString()
  category?: string;

  @ValidateIf((o) => o.type === ContentPageType.HELP_CENTER)
  @IsOptional()
  @IsString()
  subcategory?: string;

  // SEO
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}

