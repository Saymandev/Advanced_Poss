import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  companyType?: string;

  @IsOptional()
  @IsString()
  operationType?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  invoiceSubtitle?: string;

  @IsOptional()
  @IsString()
  invoiceFootnote?: string;

  @IsOptional()
  @IsString()
  invoiceCurrency?: string;

  @IsOptional()
  @IsBoolean()
  vatEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  vatPercentage?: number;

  @IsOptional()
  @IsBoolean()
  serviceChargeEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  serviceChargePercentage?: number;

  @IsOptional()
  @IsBoolean()
  kitchenControl?: boolean;

  @IsOptional()
  @IsBoolean()
  printKitchenLabel?: boolean;

  @IsOptional()
  @IsBoolean()
  invoiceLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  invoiceRatingQr?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyReport?: boolean;

  @IsOptional()
  @IsBoolean()
  deductStockByRecipe?: boolean;
}
