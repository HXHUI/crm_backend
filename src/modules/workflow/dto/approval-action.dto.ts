import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ApprovalActionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ReturnApprovalDto {
  @IsOptional()
  @IsNumber()
  returnToNodeOrder?: number; // 退回至指定节点，不指定则退回发起人

  @IsOptional()
  @IsString()
  comment?: string;
}

