import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
export type LeadRating = 'hot' | 'warm' | 'cold'

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt', type: 'timestamp', nullable: true })
  deletedAt?: Date;
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @Column({ name: 'owner_id', type: 'bigint', comment: '负责人ID' })
  ownerId: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'lead_source', default: 'other' })
  leadSource: string;

  @Column({ type: 'enum', enum: ['new','contacted','qualified','unqualified','converted'], default: 'new' })
  status: LeadStatus;

  @Column({ type: 'enum', enum: ['hot','warm','cold'], default: 'warm' })
  rating: LeadRating;

  @Column({ name: 'lastContactedAt', type: 'datetime', nullable: true })
  lastContactedAt?: Date;

  @Column({ name: 'convertedAt', type: 'datetime', nullable: true })
  convertedAt?: Date;

  @Column({ name: 'converted_customer_id', type: 'bigint', nullable: true })
  convertedCustomerId?: number;

  @Column({ name: 'converted_contact_id', type: 'bigint', nullable: true })
  convertedContactId?: number;

  @Column({ name: 'converted_opportunity_id', type: 'bigint', nullable: true })
  convertedOpportunityId?: number;

  // 新增：行业、等级
  @Column({ nullable: true, comment: '客户行业（字典key）' })
  industry?: string;

  @Column({ nullable: true, comment: '客户等级（如A/B/C/D）' })
  level?: string;

  // 新增：地址
  @Column({ nullable: true, comment: '省份' })
  province?: string;

  @Column({ nullable: true, comment: '城市' })
  city?: string;

  @Column({ nullable: true, comment: '区县' })
  district?: string;

  @Column({ name: 'address_detail', nullable: true, comment: '详细地址' })
  addressDetail?: string;
}


