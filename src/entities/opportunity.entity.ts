import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { Member } from './member.entity';
import { Activity } from './activity.entity';

export enum OpportunityStatus {
  ACTIVE = 'active',                    // 积极跟进：正常推进中，销售需要主动联系
  WAITING_CLIENT = 'waiting_client',    // 等待客户：已向客户发出请求，等待客户回复
  ON_HOLD = 'on_hold',                  // 已搁置：因客户预算、时机等原因暂时停止跟进
  AT_RISK = 'at_risk',                  // 面临风险：出现不利信号，需要立即处理
  CLOSED = 'closed',                    // 已结束：与阶段中的赢单/输单同步
}

export enum OpportunityStage {
  INITIAL_CONTACT = 'initial_contact',      // 初步接触
  NEEDS_ANALYSIS = 'needs_analysis',        // 需求分析
  PROPOSAL_QUOTE = 'proposal_quote',        // 方案/报价
  NEGOTIATION_REVIEW = 'negotiation_review', // 谈判审核
  CLOSED_WON = 'closed_won',                // 赢单
  CLOSED_LOST = 'closed_lost',              // 输单
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
    default: OpportunityStatus.ACTIVE,
    comment: '商机状态',
  })
  status: OpportunityStatus;

  @Column({
    type: 'enum',
    enum: OpportunityStage,
    default: OpportunityStage.INITIAL_CONTACT,
    comment: '商机阶段',
  })
  stage: OpportunityStage;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '预计金额' })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: '成功概率(%)' })
  probability: number;

  @Column({ name: 'expected_close_date', nullable: true, comment: '预计成交时间' })
  expectedCloseDate?: Date;

  @Column({ name: 'actual_close_date', nullable: true, comment: '实际成交时间' })
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
  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.opportunities)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'ownerId', type: 'bigint', nullable: true, comment: '负责人ID' })
  ownerId?: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'ownerId' })
  owner?: Member;

  // 活动不再直接关联商机，改为通过 relatedToType/relatedToId 关联
  // activities?: Activity[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({ name: 'department_id', type: 'bigint', nullable: true, comment: '部门ID' })
  departmentId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}
