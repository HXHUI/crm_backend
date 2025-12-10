import { IsString, IsOptional, IsNotEmpty, MaxLength, IsHexColor } from 'class-validator';

export class CreateCustomerTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: '标签名称不能超过100个字符' })
  name: string;

  @IsString()
  @IsOptional()
  @IsHexColor({ message: '请输入有效的颜色值' })
  color?: string = '#1890ff';

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '描述不能超过500个字符' })
  description?: string;
}

export class UpdateCustomerTagDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '标签名称不能超过100个字符' })
  name?: string;

  @IsString()
  @IsOptional()
  @IsHexColor({ message: '请输入有效的颜色值' })
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '描述不能超过500个字符' })
  description?: string;
}

export class QueryCustomerTagDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 50;
}
