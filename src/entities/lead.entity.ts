import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
export type LeadRating = 'hot' | 'warm' | 'cold'

@Entity('leads')
export class Lead extends BaseEntity {
  @Column({ name: 'tenant_id', comment: '租户ID' })
  tenantId: string;

  @Column({ name: 'owner_id', comment: '负责人ID' })
  ownerId: string;

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

  @Column({ type: 'datetime', nullable: true })
  lastContactedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  convertedAt?: Date;

  @Column({ name: 'converted_customer_id', nullable: true })
  convertedCustomerId?: string;

  @Column({ name: 'converted_contact_id', nullable: true })
  convertedContactId?: string;

  @Column({ name: 'converted_opportunity_id', nullable: true })
  convertedOpportunityId?: string;

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


