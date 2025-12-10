import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDateString,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VisitType, VisitStatus, VisitPriority, VisitPurpose } from '../../../entities/visit.entity';

export class CreateVisitDto {

  @ApiProperty({ description: '拜访描述', example: '讨论合作事宜', required: false })
  @IsString({ message: '描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '拜访类型', enum: VisitType, example: VisitType.FOLLOW_UP, required: false })
  @IsEnum(VisitType, { message: '请选择有效的拜访类型' })
  @IsOptional()
  type?: VisitType = VisitType.FOLLOW_UP;

  @ApiProperty({ description: '拜访状态', enum: VisitStatus, example: VisitStatus.PLANNED, required: false })
  @IsEnum(VisitStatus, { message: '请选择有效的拜访状态' })
  @IsOptional()
  status?: VisitStatus = VisitStatus.PLANNED;

  @ApiProperty({ description: '优先级', enum: VisitPriority, example: VisitPriority.MEDIUM, required: false })
  @IsEnum(VisitPriority, { message: '请选择有效的优先级' })
  @IsOptional()
  priority?: VisitPriority = VisitPriority.MEDIUM;

  @ApiProperty({ description: '计划开始时间', example: '2024-01-01T10:00:00Z' })
  @IsDateString({}, { message: '计划开始时间格式不正确' })
  @IsNotEmpty({ message: '请选择计划开始时间' })
  plannedStartTime: string;

  @ApiProperty({ description: '计划结束时间', example: '2024-01-01T12:00:00Z' })
  @IsDateString({}, { message: '计划结束时间格式不正确' })
  @IsNotEmpty({ message: '请选择计划结束时间' })
  plannedEndTime: string;

  @ApiProperty({ description: '所在地区（省市区）', example: ['北京市', '市辖区', '朝阳区'], required: false })
  @IsArray({ message: '所在地区必须是数组' })
  @IsOptional()
  region?: string[];

  @ApiProperty({ description: '详情地址', example: 'XX路XX号XX大厦XX层', required: false })
  @IsString({ message: '详情地址必须是字符串' })
  @IsOptional()
  detailAddress?: string;

  @ApiProperty({ description: '拜访目的', enum: VisitPurpose, example: VisitPurpose.UNDERSTAND_NEEDS, required: false })
  @IsEnum(VisitPurpose, { message: '请选择有效的拜访目的' })
  @IsOptional()
  purpose?: VisitPurpose;

  @ApiProperty({ description: '客户ID', example: 1, required: false })
  @IsNumber({}, { message: '客户ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  customerId?: number;

  @ApiProperty({ description: '联系人ID', example: 1, required: false })
  @IsNumber({}, { message: '联系人ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  contactId?: number;

  @ApiProperty({ description: '商机ID', example: 1, required: false })
  @IsNumber({}, { message: '商机ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  opportunityId?: number;

  @ApiProperty({
    description: '拜访费用',
    example: { travel: 500, entertainment: 300, total: 800, currency: 'CNY' },
    required: false,
  })
  @IsObject({ message: '费用必须是对象' })
  @IsOptional()
  expenses?: {
    travel?: number;
    entertainment?: number;
    other?: number;
    total?: number;
    currency?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: '拜访附件', example: ['url1', 'url2'], required: false })
  @IsArray({ message: '附件必须是数组' })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({ description: '参与人员ID数组', example: [1, 2], required: false })
  @IsArray({ message: '参与人员必须是数组' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v));
    }
    return undefined;
  })
  participants?: number[];

  @ApiProperty({ description: '负责人ID', example: 1, required: false })
  @IsNumber({}, { message: '负责人ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  ownerId?: number;

  @ApiProperty({ description: '分配人ID', example: 1, required: false })
  @IsNumber({}, { message: '分配人ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  assignedBy?: number;
}

export class UpdateVisitDto {

  @ApiProperty({ description: '拜访描述', example: '讨论合作事宜', required: false })
  @IsString({ message: '描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '拜访类型', enum: VisitType, example: VisitType.FOLLOW_UP, required: false })
  @IsEnum(VisitType, { message: '请选择有效的拜访类型' })
  @IsOptional()
  type?: VisitType;

  @ApiProperty({ description: '拜访状态', enum: VisitStatus, example: VisitStatus.PLANNED, required: false })
  @IsEnum(VisitStatus, { message: '请选择有效的拜访状态' })
  @IsOptional()
  status?: VisitStatus;

  @ApiProperty({ description: '优先级', enum: VisitPriority, example: VisitPriority.MEDIUM, required: false })
  @IsEnum(VisitPriority, { message: '请选择有效的优先级' })
  @IsOptional()
  priority?: VisitPriority;

  @ApiProperty({ description: '计划开始时间', example: '2024-01-01T10:00:00Z', required: false })
  @IsDateString({}, { message: '计划开始时间格式不正确' })
  @IsOptional()
  plannedStartTime?: string;

  @ApiProperty({ description: '计划结束时间', example: '2024-01-01T12:00:00Z', required: false })
  @IsDateString({}, { message: '计划结束时间格式不正确' })
  @IsOptional()
  plannedEndTime?: string;

  @ApiProperty({ description: '实际开始时间', example: '2024-01-01T10:05:00Z', required: false })
  @IsDateString({}, { message: '实际开始时间格式不正确' })
  @IsOptional()
  actualStartTime?: string;

  @ApiProperty({ description: '实际结束时间', example: '2024-01-01T12:10:00Z', required: false })
  @IsDateString({}, { message: '实际结束时间格式不正确' })
  @IsOptional()
  actualEndTime?: string;

  @ApiProperty({ description: '所在地区（省市区）', example: ['北京市', '市辖区', '朝阳区'], required: false })
  @IsArray({ message: '所在地区必须是数组' })
  @IsOptional()
  region?: string[];

  @ApiProperty({ description: '详情地址', example: 'XX路XX号XX大厦XX层', required: false })
  @IsString({ message: '详情地址必须是字符串' })
  @IsOptional()
  detailAddress?: string;

  @ApiProperty({ description: '拜访目的', enum: VisitPurpose, example: VisitPurpose.UNDERSTAND_NEEDS, required: false })
  @IsEnum(VisitPurpose, { message: '请选择有效的拜访目的' })
  @IsOptional()
  purpose?: VisitPurpose;

  @ApiProperty({ description: '拜访结果/反馈', example: '客户对产品很感兴趣', required: false })
  @IsString({ message: '拜访结果必须是字符串' })
  @IsOptional()
  result?: string;

  @ApiProperty({ description: '客户反馈', example: '希望进一步了解产品细节', required: false })
  @IsString({ message: '客户反馈必须是字符串' })
  @IsOptional()
  feedback?: string;

  @ApiProperty({ description: '下一步行动计划', example: '发送产品详细资料', required: false })
  @IsString({ message: '下一步行动计划必须是字符串' })
  @IsOptional()
  nextAction?: string;

  @ApiProperty({ description: '客户ID', example: 1, required: false })
  @IsNumber({}, { message: '客户ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  customerId?: number;

  @ApiProperty({ description: '联系人ID', example: 1, required: false })
  @IsNumber({}, { message: '联系人ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  contactId?: number;

  @ApiProperty({ description: '商机ID', example: 1, required: false })
  @IsNumber({}, { message: '商机ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  opportunityId?: number;

  @ApiProperty({
    description: '拜访费用',
    example: { travel: 500, entertainment: 300, total: 800, currency: 'CNY' },
    required: false,
  })
  @IsObject({ message: '费用必须是对象' })
  @IsOptional()
  expenses?: {
    travel?: number;
    entertainment?: number;
    other?: number;
    total?: number;
    currency?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: '拜访附件', example: ['url1', 'url2'], required: false })
  @IsArray({ message: '附件必须是数组' })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({ description: '参与人员ID数组', example: [1, 2], required: false })
  @IsArray({ message: '参与人员必须是数组' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v));
    }
    return undefined;
  })
  participants?: number[];

  @ApiProperty({ description: '分配人ID', example: 1, required: false })
  @IsNumber({}, { message: '分配人ID必须是数字' })
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  assignedBy?: number;
}

export class QueryVisitDto {

  @ApiProperty({ description: '拜访类型', enum: VisitType, required: false })
  @IsEnum(VisitType)
  @IsOptional()
  type?: VisitType;

  @ApiProperty({ description: '拜访状态', enum: VisitStatus, required: false })
  @IsEnum(VisitStatus)
  @IsOptional()
  status?: VisitStatus;

  @ApiProperty({ description: '客户ID', required: false })
  @IsNumber({}, {})
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  customerId?: number;

  @ApiProperty({ description: '联系人ID', required: false })
  @IsNumber({}, {})
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  contactId?: number;

  @ApiProperty({ description: '商机ID', required: false })
  @IsNumber({}, {})
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  opportunityId?: number;

  @ApiProperty({ description: '负责人ID', required: false })
  @IsNumber({}, {})
  @IsOptional()
  @Transform(({ value }) => value ? (typeof value === 'string' ? parseInt(value, 10) : value) : undefined)
  ownerId?: number;

  @ApiProperty({ description: '开始日期（查询该日期之后的拜访）', example: '2024-01-01', required: false })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: '结束日期（查询该日期之前的拜访）', example: '2024-12-31', required: false })
  @IsDateString({}, { message: '结束日期格式不正确' })
  @IsOptional()
  endDate?: string;

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
  limit?: number = 50;
}

export class CheckInDto {
  @ApiProperty({ description: '签到照片URL', example: 'https://example.com/photo.jpg', required: false })
  @IsString({ message: '签到照片URL必须是字符串' })
  @IsOptional()
  checkInPhoto?: string;

  @ApiProperty({ description: '签到备注', example: '已到达客户公司', required: false })
  @IsString({ message: '签到备注必须是字符串' })
  @IsOptional()
  remark?: string;
}

