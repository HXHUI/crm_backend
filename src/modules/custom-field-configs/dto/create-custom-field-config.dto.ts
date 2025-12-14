import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomFieldType, EntityType, FieldOptions, ValidationRules } from '../../../entities/custom-field-config.entity';

class FieldOptionsDto {
  @IsOptional()
  @IsIn(['manual', 'dict'])
  sourceType?: 'manual' | 'dict';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  options?: Array<{ label: string; value: string }>;

  @IsOptional()
  @IsString()
  dictTypeCode?: string;
}

class ValidationRulesDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLength?: number;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateCustomFieldConfigDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsString()
  @MaxLength(100)
  fieldCode: string;

  @IsString()
  @MaxLength(100)
  fieldName: string;

  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FieldOptionsDto)
  fieldOptions?: FieldOptions;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validationRules?: ValidationRules;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupName?: string;
}

