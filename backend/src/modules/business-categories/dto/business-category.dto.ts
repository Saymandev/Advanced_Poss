import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBusinessCategoryDto {
  @ApiProperty({ description: 'The display name of the category' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The unique code identifier for the category' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'The parent business type (restaurant or retail)', enum: ['restaurant', 'retail'] })
  @IsEnum(['restaurant', 'retail'])
  @IsNotEmpty()
  businessType: string;

  @ApiProperty({ description: 'Whether the category is active', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBusinessCategoryDto extends PartialType(CreateBusinessCategoryDto) {}
