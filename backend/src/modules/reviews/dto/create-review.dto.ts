import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

class ItemReviewDto {
  @ApiProperty({ example: '60d0fe4f3a7c7d001c8b4567' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 'Grilled Salmon' })
  @IsString()
  @IsNotEmpty()
  menuItemName: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Delicious and perfectly cooked!' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateReviewDto {
  @ApiProperty({ example: '60d0fe4f3a7c7d001c8b4567' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  waiterRating?: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  foodRating: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  ambianceRating?: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ example: 'Great food and excellent service!' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [ItemReviewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemReviewDto)
  itemReviews?: ItemReviewDto[];
}

