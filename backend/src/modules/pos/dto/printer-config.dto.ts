import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export interface PrinterLocationDto {
  name: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export class CreatePrinterConfigDto {
  @IsString()
  name: string;

  @IsEnum(['thermal', 'laser', 'inkjet', 'network'])
  type: string;

  @IsNumber()
  @Min(10)
  @Max(1000)
  width: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  height?: number;

  @IsOptional()
  @IsString()
  networkUrl?: string;

  @IsOptional()
  @IsString()
  driver?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  location?: PrinterLocationDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  copies?: number = 1;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: string = 'normal';

  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean = false;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  settings?: {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    quality?: 'draft' | 'normal' | 'high';
    colorMode?: 'monochrome' | 'color';
    duplex?: boolean;
  };
}

export class UpdatePrinterConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['thermal', 'laser', 'inkjet', 'network'])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  height?: number;

  @IsOptional()
  @IsString()
  networkUrl?: string;

  @IsOptional()
  @IsString()
  driver?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  location?: PrinterLocationDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  copies?: number;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: string;

  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  settings?: {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    quality?: 'draft' | 'normal' | 'high';
    colorMode?: 'monochrome' | 'color';
    duplex?: boolean;
  };
}

export class PrinterTestDto {
  @IsString()
  printerName: string;

  @IsOptional()
  @IsString()
  testContent?: string;
}

export class PrintJobDto {
  @IsString()
  content: string;

  @IsString()
  printerName: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  copies?: number = 1;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: string = 'normal';
}
