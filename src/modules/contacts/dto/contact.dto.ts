import { IsString, IsOptional, IsNotEmpty, IsEmail, IsBoolean, IsEnum, IsObject, ValidateIf, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '../../../entities/contact.entity';

export class CreateContactDto {
  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString({ message: '姓名必须是字符串' })
  @IsNotEmpty({ message: '姓名不能为空' })
  name: string;

  @ApiProperty({ description: '职位', example: '销售经理', required: false })
  @IsString({ message: '职位必须是字符串' })
  @IsOptional()
  position?: string;

  @ApiProperty({ description: '部门', example: '销售部', required: false })
  @IsString({ message: '部门必须是字符串' })
  @IsOptional()
  department?: string;

  @ApiProperty({ description: '邮箱', example: 'zhangsan@example.com', required: false })
  @IsString({ message: '邮箱必须是字符串' })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== '')
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString({ message: '手机号必须是字符串' })
  @IsNotEmpty({ message: '请输入手机号' })
  phone: string;

  @ApiProperty({ description: '座机', example: '010-12345678', required: false })
  @IsString({ message: '座机必须是字符串' })
  @IsOptional()
  telephone?: string;

  @ApiProperty({ description: '联系人类型', enum: ContactType, example: ContactType.SECONDARY })
  @IsEnum(ContactType, { message: '请选择有效的联系人类型' })
  @IsOptional()
  type?: ContactType = ContactType.SECONDARY;

  @ApiProperty({ description: '是否主要联系人', example: false, required: false })
  @IsBoolean({ message: '是否主要联系人必须是布尔值' })
  @IsOptional()
  isPrimary?: boolean = false;

  @ApiProperty({ description: '备注', example: '重要客户的联系人', required: false })
  @IsString({ message: '备注必须是字符串' })
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: '其他联系方式 (JSON)', example: { wechat: 'zhangsan_wx' }, required: false })
  @IsObject({ message: '其他联系方式必须是对象' })
  @IsOptional()
  otherContacts?: Record<string, string>;

  @ApiProperty({ description: '关联客户ID', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsString({ message: '客户ID必须是字符串' })
  @IsNotEmpty({ message: '请选择关联客户' })
  customerId: string;
}

export class UpdateContactDto {
  @ApiProperty({ description: '联系人姓名', example: '张三', required: false })
  @IsString({ message: '姓名必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '职位', example: '销售经理', required: false })
  @IsString({ message: '职位必须是字符串' })
  @IsOptional()
  position?: string;

  @ApiProperty({ description: '部门', example: '销售部', required: false })
  @IsString({ message: '部门必须是字符串' })
  @IsOptional()
  department?: string;

  @ApiProperty({ description: '邮箱', example: 'zhangsan@example.com', required: false })
  @IsString({ message: '邮箱必须是字符串' })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== '')
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsString({ message: '手机号必须是字符串' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '座机', example: '010-12345678', required: false })
  @IsString({ message: '座机必须是字符串' })
  @IsOptional()
  telephone?: string;

  @ApiProperty({ description: '联系人类型', enum: ContactType, example: ContactType.SECONDARY, required: false })
  @IsEnum(ContactType, { message: '请选择有效的联系人类型' })
  @IsOptional()
  type?: ContactType;

  @ApiProperty({ description: '是否主要联系人', example: false, required: false })
  @IsBoolean({ message: '是否主要联系人必须是布尔值' })
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({ description: '备注', example: '重要客户的联系人', required: false })
  @IsString({ message: '备注必须是字符串' })
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: '其他联系方式 (JSON)', example: { wechat: 'zhangsan_wx' }, required: false })
  @IsObject({ message: '其他联系方式必须是对象' })
  @IsOptional()
  otherContacts?: Record<string, string>;
}

export class QueryContactDto {
  @ApiProperty({ description: '联系人姓名', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '联系人类型', enum: ContactType, required: false })
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @ApiProperty({ description: '关联客户ID', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}