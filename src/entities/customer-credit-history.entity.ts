import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { Member } from './member.entity';

@Entity('customer_credit_history')
export class CustomerCreditHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;
  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'old_limit', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '原信用额度' })
  oldLimit?: number;

  @Column({ name: 'new_limit', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '新信用额度' })
  newLimit?: number;

  @Column({ name: 'old_tier', type: 'varchar', length: 20, nullable: true, comment: '原额度档位' })
  oldTier?: string;

  @Column({ name: 'new_tier', type: 'varchar', length: 20, nullable: true, comment: '新额度档位' })
  newTier?: string;

  @Column({ name: 'old_rating', type: 'varchar', length: 10, nullable: true, comment: '原客户等级（来自customers.level）' })
  oldRating?: string;

  @Column({ name: 'new_rating', type: 'varchar', length: 10, nullable: true, comment: '新客户等级（来自customers.level）' })
  newRating?: string;

  @Column({ name: 'change_reason', type: 'varchar', length: 500, nullable: true, comment: '变更原因' })
  changeReason?: string;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true, comment: '变更人ID（关联members.id）' })
  changedBy?: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'changed_by' })
  changer: Member;

  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

