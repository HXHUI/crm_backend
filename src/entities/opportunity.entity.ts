import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { Member } from './member.entity';
import { Activity } from './activity.entity';

export enum OpportunityStatus {
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  VALUE_PROPOSITION = 'value_proposition',
  IDENTIFY_DECISION_MAKERS = 'identify_decision_makers',
  PROPOSAL_PRICE_QUOTE = 'proposal_price_quote',
  NEGOTIATION_REVIEW = 'negotiation_review',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum OpportunityStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED = 'closed',
}

@Entity('opportunities')
export class Opportunity extends BaseEntity {
  @Column({ comment: '商机名称' })
  name: string;

  @Column({ nullable: true, comment: '商机描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: OpportunityStatus,
    default: OpportunityStatus.QUALIFICATION,
    comment: '商机状态',
  })
  status: OpportunityStatus;

  @Column({
    type: 'enum',
    enum: OpportunityStage,
    default: OpportunityStage.PROSPECTING,
    comment: '商机阶段',
  })
  stage: OpportunityStage;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '预计金额' })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: '成功概率(%)' })
  probability: number;

  @Column({ nullable: true, comment: '预计成交时间' })
  expectedCloseDate?: Date;

  @Column({ nullable: true, comment: '实际成交时间' })
  actualCloseDate?: Date;

  @Column({ nullable: true, comment: '商机来源' })
  source?: string;

  @Column({ nullable: true, comment: '竞争对手' })
  competitor?: string;

  @Column({ type: 'json', nullable: true, comment: '商机标签' })
  tags?: string[];

  @Column({ type: 'json', nullable: true, comment: '商机备注' })
  notes?: Record<string, any>;

  // 关联关系
  @Column({ comment: '客户ID' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.opportunities)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true, comment: '负责人ID' })
  ownerId?: string;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'ownerId' })
  owner?: Member;

  // 活动不再直接关联商机，改为通过 relatedToType/relatedToId 关联
  // activities?: Activity[];

  // 租户ID
  @Column({ name: 'tenant_id', nullable: true, comment: '租户ID' })
  tenantId?: string;
}
