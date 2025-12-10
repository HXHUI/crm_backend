import { IsNumber, IsString, IsOptional } from 'class-validator';

export class TransferApprovalDto {
  @IsNumber()
  transferredTo: number; // 转办给哪个成员

  @IsOptional()
  @IsString()
  comment?: string;
}

