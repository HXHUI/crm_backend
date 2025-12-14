import { IsObject, IsOptional } from 'class-validator';

export class UpdateCustomerCustomFieldsDto {
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

