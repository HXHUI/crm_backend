import { IsEnum, IsOptional, IsString, IsArray, IsNumber, MaxLength, ValidateIf } from 'class-validator';
import { InvoiceRequirement, CreditTier } from '../../../entities/customer-profile.entity';

export class CreateCustomerProfileDto {
  @IsEnum(InvoiceRequirement)
  @IsOptional()
  invoiceRequirement?: InvoiceRequirement;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  invoiceRemark?: string;

  @IsArray()
  @IsOptional()
  shippingMethods?: string[];

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsEnum(CreditTier)
  @IsOptional()
  creditTier?: CreditTier;

  // 资金状况：abundant(充裕)/normal(一般)/tight(紧张)
  @IsString()
  @IsOptional()
  fundStatus?: string;

  // 经营年限（年）
  @IsNumber()
  @IsOptional()
  businessYears?: number;

  // 行业口碑：good(优)/fair(良)/bad(差)
  @IsString()
  @IsOptional()
  industryReputation?: string;

  // 发展潜力：high(大)/medium(中)/low(小)
  @IsString()
  @IsOptional()
  growthPotential?: string;

  // 老板类型：aggressive(开拓型)/conservative(保守型)
  @IsString()
  @IsOptional()
  ownerType?: string;

  // 综评结论
  @IsString()
  @IsOptional()
  overallComment?: string;
}

export class UpdateCustomerProfileDto {
  @IsEnum(InvoiceRequirement)
  @IsOptional()
  invoiceRequirement?: InvoiceRequirement;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  invoiceRemark?: string;

  @IsArray()
  @IsOptional()
  shippingMethods?: string[];

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsEnum(CreditTier)
  @IsOptional()
  creditTier?: CreditTier;

  @IsString()
  @IsOptional()
  fundStatus?: string;

  @IsNumber()
  @IsOptional()
  businessYears?: number;

  @IsString()
  @IsOptional()
  industryReputation?: string;

  @IsString()
  @IsOptional()
  growthPotential?: string;

  @IsString()
  @IsOptional()
  ownerType?: string;

  @IsString()
  @IsOptional()
  overallComment?: string;
}

export class UpdateCreditInfoDto {
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsEnum(CreditTier)
  @IsOptional()
  creditTier?: CreditTier;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  level?: string; // 客户等级（更新customers.level）

  @IsString()
  @MaxLength(500)
  @ValidateIf((o) => o.creditLimit !== undefined || o.creditTier !== undefined || o.level !== undefined)
  changeReason: string; // 变更原因（必填）
}

