import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessType } from '../../../entities/workflow-template.entity';
import { NodeType, ApprovalMode } from '../../../entities/workflow-node.entity';

export class CreateWorkflowNodeDto {
  @IsString()
  name: string;

  @IsEnum(NodeType)
  nodeType: NodeType;

  @IsEnum(ApprovalMode)
  approvalMode: ApprovalMode;

  @IsObject()
  approverConfig: Record<string, any>;

  @IsOptional()
  nodeOrder?: number;
}

export class CreateWorkflowTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowNodeDto)
  nodes: CreateWorkflowNodeDto[];
}

