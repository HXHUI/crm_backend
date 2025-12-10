import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

/**
 * 需求类型枚举
 */
export enum RequirementType {
  EXPLICIT = 'explicit',    // 显性需求
  IMPLICIT = 'implicit',    // 隐性需求
  INTANGIBLE = 'intangible', // 无形需求
}

/**
 * 客户需求实体
 */
@Entity('customer_requirements')
export class CustomerRequirement extends BaseEntity {
  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.requirements)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'enum',
    enum: RequirementType,
    comment: '需求类型：显性需求（客户提出的需求）、隐性需求（客户可能会有的需求）、无形需求（需要自己主动发现）',
  })
  type: RequirementType;

  @Column({ comment: '需求内容' })
  content: string;

  @Column({ name: 'problem_to_solve', type: 'text', nullable: true, comment: '需求背后要解决的问题' })
  problemToSolve?: string;

  @Column({ type: 'json', nullable: true, comment: '需求标签（如：价格、质量、技术支持等）' })
  tags?: string[];

  @Column({ type: 'int', default: 0, comment: '优先级：0-低，1-中，2-高' })
  priority: number;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '状态：pending-待处理，processing-处理中，resolved-已解决，closed-已关闭' })
  status: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true, comment: '解决时间' })
  resolvedAt?: Date;

  @Column({ name: 'resolved_by', type: 'bigint', nullable: true, comment: '解决人ID' })
  resolvedBy?: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

