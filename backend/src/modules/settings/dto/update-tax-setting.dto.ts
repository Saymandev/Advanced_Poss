import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxSettingDto } from './create-tax-setting.dto';

export class UpdateTaxSettingDto extends PartialType(CreateTaxSettingDto) {}

