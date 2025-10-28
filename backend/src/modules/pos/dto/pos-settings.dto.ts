import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ReceiptSettingsDto {
  @IsNotEmpty()
  @IsString()
  header: string;

  @IsNotEmpty()
  @IsString()
  footer: string;

  @IsNotEmpty()
  @IsBoolean()
  showLogo: boolean;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(24)
  fontSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  paperWidth?: number;
}

export class PrinterSettingsDto {
  @IsNotEmpty()
  @IsBoolean()
  enabled: boolean;

  @IsNotEmpty()
  @IsString()
  printerId: string;

  @IsNotEmpty()
  @IsBoolean()
  autoPrint: boolean;

  @IsOptional()
  @IsString()
  printerType?: 'thermal' | 'laser' | 'inkjet';

  @IsOptional()
  @IsString()
  paperSize?: '58mm' | '80mm' | 'A4';
}

export class CreatePOSSettingsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => ReceiptSettingsDto)
  receiptSettings: ReceiptSettingsDto;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => PrinterSettingsDto)
  printerSettings: PrinterSettingsDto;
}

export class UpdatePOSSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReceiptSettingsDto)
  receiptSettings?: ReceiptSettingsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PrinterSettingsDto)
  printerSettings?: PrinterSettingsDto;
}

