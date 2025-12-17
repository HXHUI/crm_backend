import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';
import { Customer } from './customer.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

export enum VisitType {
  FIRST_VISIT = 'first_visit', // 首次拜访
  FOLLOW_UP = 'follow_up', // 跟进拜访
  MAINTENANCE = 'maintenance', // 维护拜访
  BUSINESS_NEGOTIATION = 'business_negotiation', // 商务洽谈
  TECHNICAL_SUPPORT = 'technical_support', // 技术支持
  TRAINING = 'training', // 培训
  OTHER = 'other', // 其他
}

export enum VisitStatus {
  PLANNED = 'planned', // 计划中
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled', // 已取消
}

export enum VisitPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum VisitPurpose {
  UNDERSTAND_NEEDS = 'understand_needs', // 了解需求
  MONTHLY_PERFORMANCE = 'monthly_performance', // 月度履约
  PERFORMANCE_INCREMENT = 'performance_increment', // 业绩增量
  PRODUCT_PROMOTION = 'product_promotion', // 产品推广
  HOLIDAY_VISIT = 'holiday_visit', // 节日走访
  CONTRACT_SIGNING = 'contract_signing', // 合同签订
  SIGN_STATEMENT = 'sign_statement', // 签对账单
  PRICE_POLICY = 'price_policy', // 价格政策
  AFTER_SALES_SERVICE = 'after_sales_service', // 售后服务
  NEGOTIATE_COOPERATION = 'negotiate_cooperation', // 协商合作细节
  UNDERSTAND_BUSINESS = 'understand_business', // 了解客户经营状况
  SAMPLE_TRACKING = 'sample_tracking', // 样品跟踪测试
}

@Entity('visits')
export class Visit extends BaseEntity {
  @Column({ nullable: true, comment: '拜访描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: VisitType,
    default: VisitType.FOLLOW_UP,
    comment: '拜访类型',
  })
  type: VisitType;

  @Column({
    type: 'enum',
    enum: VisitStatus,
    default: VisitStatus.PLANNED,
    comment: '拜访状态',
  })
  status: VisitStatus;

  @Column({
    type: 'enum',
    enum: VisitPriority,
    default: VisitPriority.MEDIUM,
    comment: '优先级',
  })
  priority: VisitPriority;

  // 时间信息
  @Column({ name: 'planned_start_time', type: 'datetime', comment: '计划开始时间' })
  plannedStartTime: Date;

  @Column({ name: 'planned_end_time', type: 'datetime', comment: '计划结束时间' })
  plannedEndTime: Date;

  @Column({ name: 'actual_start_time', type: 'datetime', nullable: true, comment: '实际开始时间' })
  actualStartTime?: Date;

  @Column({ name: 'actual_end_time', type: 'datetime', nullable: true, comment: '实际结束时间' })
  actualEndTime?: Date;

  @Column({ name: 'check_in_time', type: 'datetime', nullable: true, comment: '签到时间' })
  checkInTime?: Date;

  // 位置信息
  @Column({ type: 'json', nullable: true, comment: '所在地区（省市区）' })
  region?: string[];

  @Column({ name: 'detail_address', nullable: true, comment: '详情地址' })
  detailAddress?: string;

  // 业务信息
  @Column({
    type: 'enum',
    enum: VisitPurpose,
    nullable: true,
    comment: '拜访目的',
  })
  purpose?: VisitPurpose;

  @Column({ type: 'json', nullable: true, comment: '拜访准备（字典值数组）' })
  preparation?: string[];

  @Column({ type: 'text', nullable: true, comment: '拜访结果/反馈' })
  result?: string;

  @Column({ type: 'text', nullable: true, comment: '客户反馈' })
  feedback?: string;

  @Column({ type: 'text', nullable: true, comment: '下一步行动计划' })
  nextAction?: string;

  // 关联信息
  @Column({ name: 'customer_id', type: 'bigint', nullable: true, comment: '客户ID' })
  customerId?: number;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'contact_id', type: 'bigint', nullable: true, comment: '联系人ID' })
  contactId?: number;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact?: Contact;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, comment: '商机ID' })
  opportunityId?: number;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity?: Opportunity;

  // 费用信息（JSON格式）
  @Column({ type: 'json', nullable: true, comment: '拜访费用' })
  expenses?: {
    travel?: number; // 差旅费
    entertainment?: number; // 招待费
    other?: number; // 其他费用
    total?: number; // 总费用
    currency?: string; // 货币单位
    [key: string]: any; // 允许扩展
  };

  // 附件信息
  @Column({ type: 'json', nullable: true, comment: '拜访附件' })
  attachments?: string[];

  @Column({ name: 'check_in_photo', nullable: true, comment: '签到照片URL' })
  checkInPhoto?: string;

  // 参与人员
  @Column({ type: 'json', nullable: true, comment: '参与人员（成员ID数组）' })
  participants?: number[];

  // 负责人和分配人
  @Column({ name: 'owner_id', type: 'bigint', comment: '负责人ID' })
  ownerId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'owner_id' })
  owner: Member;

  @Column({ name: 'assigned_by', type: 'bigint', nullable: true, comment: '分配人(成员ID)' })
  assignedBy?: number;

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

