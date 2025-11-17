import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Contract } from './contract.entity';
import { Member } from './member.entity';

export enum ApprovalStatus {
  PENDING = 'pending',     // 待审批
  APPROVED = 'approved',   // 已通过
  REJECTED = 'rejected',   // 已拒绝
}

@Entity('contract_approvals')
export class ContractApproval extends BaseEntity {
  @Column({ name: 'contract_id', type: 'bigint', comment: '合同ID' })
  contractId: number;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'approver_id', type: 'bigint', comment: '审批人ID' })
  approverId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'approver_id' })
  approver: Member;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
    comment: '审批状态',
  })
  status: ApprovalStatus;

  @Column({ name: 'approval_comment', type: 'text', nullable: true, comment: '审批意见' })
  approvalComment?: string;

  @Column({ name: 'approval_time', type: 'timestamp', nullable: true, comment: '审批时间' })
  approvalTime?: Date;

  @Column({ name: 'approval_order', type: 'int', default: 1, comment: '审批顺序' })
  approvalOrder: number;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

