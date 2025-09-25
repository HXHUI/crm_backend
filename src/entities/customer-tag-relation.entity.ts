import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerTag } from './customer-tag.entity';

@Entity('customer_tag_relations')
export class CustomerTagRelation {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '客户ID' })
  customerId: string;

  @PrimaryColumn({ type: 'varchar', length: 36, comment: '标签ID' })
  tagId: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关系
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => CustomerTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: CustomerTag;
}
