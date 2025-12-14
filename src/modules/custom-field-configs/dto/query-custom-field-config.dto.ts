import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType } from '../../../entities/custom-field-config.entity';

export class QueryCustomFieldConfigDto {
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string; // 搜索字段名称或编码
}

