import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceChargeSettingDto } from './create-service-charge-setting.dto';

export class UpdateServiceChargeSettingDto extends PartialType(
  CreateServiceChargeSettingDto,
) {}

