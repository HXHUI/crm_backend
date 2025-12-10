import { IsArray, IsNumber, IsString, IsOptional } from 'class-validator';

export class AddSignDto {
  @IsArray()
  @IsNumber({}, { each: true })
  approverIds: number[]; // 加签的审批人ID列表

  @IsOptional()
  @IsString()
  comment?: string;
}

