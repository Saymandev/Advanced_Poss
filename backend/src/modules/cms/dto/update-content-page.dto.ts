import { PartialType } from '@nestjs/mapped-types';
import { CreateContentPageDto } from './create-content-page.dto';

export class UpdateContentPageDto extends PartialType(CreateContentPageDto) {}

