import { IsEnum, IsOptional, IsString, IsArray, IsNumber, IsDecimal, MaxLength, ValidateIf } from 'class-validator';
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

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  mainCategoryIds?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competitorBrands?: string[];

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsEnum(CreditTier)
  @IsOptional()
  creditTier?: CreditTier;
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

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  mainCategoryIds?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competitorBrands?: string[];

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsEnum(CreditTier)
  @IsOptional()
  creditTier?: CreditTier;
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

