import { IsBoolean, IsOptional } from 'class-validator';

export class RestoreBackupDto {
  @IsBoolean()
  @IsOptional()
  dropExisting?: boolean;
}

