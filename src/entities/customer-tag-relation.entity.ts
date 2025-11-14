import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerTag } from './customer-tag.entity';

@Entity('customer_tag_relations')
export class CustomerTagRelation {
  @PrimaryColumn({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @PrimaryColumn({ name: 'tag_id', type: 'bigint', comment: '标签ID' })
  tagId: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  // 关系
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => CustomerTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: CustomerTag;
}
