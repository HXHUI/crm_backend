import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomFieldConfigDto } from './create-custom-field-config.dto';

export class UpdateCustomFieldConfigDto extends PartialType(CreateCustomFieldConfigDto) {}

