import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BusinessType } from '../../../entities/workflow-template.entity';

export class SubmitApprovalDto {
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsNumber()
  businessId: number;

  @IsNumber()
  templateId: number;

  @IsOptional()
  @IsString()
  submitComment?: string;
}

