import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowApproverResolverService } from './workflow-approver-resolver.service';
import { WorkflowTemplate } from '../../entities/workflow-template.entity';
import { WorkflowNode } from '../../entities/workflow-node.entity';
import { WorkflowInstance } from '../../entities/workflow-instance.entity';
import { WorkflowRecord } from '../../entities/workflow-record.entity';
import { Member } from '../../entities/member.entity';
import { MemberRole } from '../../entities/member-role.entity';
import { Department } from '../../entities/department.entity';
import { Quote } from '../../entities/quote.entity';
import { Contract } from '../../entities/contract.entity';
import { Order } from '../../entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowTemplate,
      WorkflowNode,
      WorkflowInstance,
      WorkflowRecord,
      Member,
      MemberRole,
      Department,
      Quote,
      Contract,
      Order,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowInstanceService, WorkflowApproverResolverService],
  exports: [WorkflowService, WorkflowInstanceService],
})
export class WorkflowModule {}

