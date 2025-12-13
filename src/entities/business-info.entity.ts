import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

@Entity('business_info')
export class BusinessInfo extends BaseEntity {
  // 关联客户（可选，因为线索也可能有工商信息）
  @Column({ name: 'customer_id', type: 'bigint', nullable: true, comment: '客户ID' })
  customerId?: number;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  // 基本工商信息
  @Column({ name: 'unified_social_credit_code', nullable: true, comment: '统一社会信用代码' })
  unifiedSocialCreditCode?: string;

  @Column({ name: 'company_name', nullable: true, comment: '企业名称' })
  companyName?: string;

  @Column({ name: 'legal_representative', nullable: true, comment: '法定代表人' })
  legalRepresentative?: string;

  @Column({ name: 'operating_status', nullable: true, comment: '经营状态' })
  operatingStatus?: string;

  @Column({ name: 'registered_capital', type: 'decimal', precision: 20, scale: 2, nullable: true, comment: '注册资本' })
  registeredCapital?: number;

  @Column({ name: 'paid_in_capital', type: 'decimal', precision: 20, scale: 2, nullable: true, comment: '实缴资本' })
  paidInCapital?: number;

  @Column({ name: 'business_registration_number', nullable: true, comment: '工商注册号' })
  businessRegistrationNumber?: string;

  @Column({ name: 'organization_code', nullable: true, comment: '组织机构代码' })
  organizationCode?: string;

  @Column({ name: 'establishment_date', type: 'date', nullable: true, comment: '成立日期' })
  establishmentDate?: Date;

  @Column({ name: 'company_type', nullable: true, comment: '企业类型' })
  companyType?: string;

  @Column({ name: 'business_term', nullable: true, comment: '营业期限' })
  businessTerm?: string;

  @Column({ name: 'registration_authority', nullable: true, comment: '登记机关' })
  registrationAuthority?: string;

  @Column({ name: 'approval_date', type: 'date', nullable: true, comment: '核准日期' })
  approvalDate?: Date;

  @Column({ name: 'registered_address', type: 'text', nullable: true, comment: '注册地址' })
  registeredAddress?: string;

  @Column({ name: 'business_scope', type: 'text', nullable: true, comment: '经营范围' })
  businessScope?: string;

  // 缓存相关字段
  @Column({ name: 'last_sync_time', type: 'timestamp', nullable: true, comment: '最后同步时间' })
  lastSyncTime?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true, comment: '过期时间' })
  expiresAt?: Date;

  // 关联子表
  @OneToMany(() => BusinessPersonnel, (personnel) => personnel.businessInfo, { cascade: true })
  personnel?: BusinessPersonnel[];

  @OneToMany(() => BusinessShareholder, (shareholder) => shareholder.businessInfo, { cascade: true })
  shareholders?: BusinessShareholder[];

  @OneToMany(() => BusinessBranch, (branch) => branch.businessInfo, { cascade: true })
  branches?: BusinessBranch[];

  @OneToMany(() => BusinessInvestment, (investment) => investment.businessInfo, { cascade: true })
  investments?: BusinessInvestment[];

  @OneToMany(() => BusinessChangeRecord, (record) => record.businessInfo, { cascade: true })
  changeRecords?: BusinessChangeRecord[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

@Entity('business_personnel')
export class BusinessPersonnel extends BaseEntity {
  @Column({ name: 'business_info_id', type: 'bigint', comment: '工商信息ID' })
  businessInfoId: number;

  @ManyToOne(() => BusinessInfo, (info) => info.personnel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo: BusinessInfo;

  @Column({ nullable: true, comment: '姓名' })
  name?: string;

  @Column({ nullable: true, comment: '职务' })
  position?: string;
}

@Entity('business_shareholders')
export class BusinessShareholder extends BaseEntity {
  @Column({ name: 'business_info_id', type: 'bigint', comment: '工商信息ID' })
  businessInfoId: number;

  @ManyToOne(() => BusinessInfo, (info) => info.shareholders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo: BusinessInfo;

  @Column({ name: 'shareholder_name', nullable: true, comment: '股东名称' })
  shareholderName?: string;

  @Column({ name: 'shareholding_ratio', type: 'decimal', precision: 10, scale: 4, nullable: true, comment: '持股比例(%)' })
  shareholdingRatio?: number;

  @Column({ name: 'shareholder_type', nullable: true, comment: '股东类型' })
  shareholderType?: string;

  @Column({ name: 'investment_amount', type: 'decimal', precision: 20, scale: 2, nullable: true, comment: '投资金额(万元)' })
  investmentAmount?: number;
}

@Entity('business_branches')
export class BusinessBranch extends BaseEntity {
  @Column({ name: 'business_info_id', type: 'bigint', comment: '工商信息ID' })
  businessInfoId: number;

  @ManyToOne(() => BusinessInfo, (info) => info.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo: BusinessInfo;

  @Column({ name: 'company_name', nullable: true, comment: '公司名称' })
  companyName?: string;

  @Column({ name: 'person_in_charge', nullable: true, comment: '负责人' })
  personInCharge?: string;

  @Column({ name: 'establishment_date', type: 'date', nullable: true, comment: '成立时间' })
  establishmentDate?: Date;

  @Column({ name: 'operating_status', nullable: true, comment: '经营状态' })
  operatingStatus?: string;
}

@Entity('business_investments')
export class BusinessInvestment extends BaseEntity {
  @Column({ name: 'business_info_id', type: 'bigint', comment: '工商信息ID' })
  businessInfoId: number;

  @ManyToOne(() => BusinessInfo, (info) => info.investments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo: BusinessInfo;

  @Column({ name: 'invested_company', nullable: true, comment: '被投资企业' })
  investedCompany?: string;

  @Column({ name: 'shareholder_type', nullable: true, comment: '股东类型' })
  shareholderType?: string;

  @Column({ name: 'shareholding_ratio', type: 'decimal', precision: 10, scale: 4, nullable: true, comment: '持股比例(%)' })
  shareholdingRatio?: number;

  @Column({ name: 'investment_amount', type: 'decimal', precision: 20, scale: 2, nullable: true, comment: '投资金额(元)' })
  investmentAmount?: number;

  // 天眼查原始字段
  @Column({ name: 'tianyancha_id', type: 'bigint', nullable: true, comment: '天眼查ID' })
  tianyanchaId?: number;

  @Column({ name: 'reg_status', nullable: true, comment: '经营状态' })
  regStatus?: string;

  @Column({ name: 'amount', type: 'decimal', precision: 20, scale: 2, nullable: true, comment: '投资金额数值' })
  amount?: number;

  @Column({ name: 'amount_suffix', nullable: true, comment: '金额后缀' })
  amountSuffix?: string;

  @Column({ name: 'paidin_time', type: 'bigint', nullable: true, comment: '实缴时间(时间戳)' })
  paidinTime?: number;

  @Column({ name: 'establishment_time', type: 'bigint', nullable: true, comment: '成立时间(时间戳)' })
  establishmentTime?: number;

  @Column({ name: 'establishment_date', type: 'date', nullable: true, comment: '成立日期' })
  establishmentDate?: Date;

  @Column({ name: 'reg_capital', nullable: true, comment: '注册资本' })
  regCapital?: string;

  @Column({ name: 'subscription_time', type: 'bigint', nullable: true, comment: '认缴时间(时间戳)' })
  subscriptionTime?: number;

  @Column({ name: 'subscription_date', type: 'date', nullable: true, comment: '认缴日期' })
  subscriptionDate?: Date;

  @Column({ name: 'type', type: 'int', nullable: true, comment: '类型(1=公司,2=人)' })
  type?: number;

  @Column({ name: 'percent', nullable: true, comment: '持股比例(字符串格式)' })
  percent?: string;

  @Column({ name: 'legal_person_name', nullable: true, comment: '法定代表人' })
  legalPersonName?: string;

  @Column({ name: 'business_scope', type: 'text', nullable: true, comment: '经营范围' })
  businessScope?: string;

  @Column({ name: 'org_type', nullable: true, comment: '企业类型' })
  orgType?: string;

  @Column({ name: 'credit_code', nullable: true, comment: '统一社会信用代码' })
  creditCode?: string;

  @Column({ name: 'alias', nullable: true, comment: '别名' })
  alias?: string;

  @Column({ name: 'category', nullable: true, comment: '行业类别' })
  category?: string;

  @Column({ name: 'person_type', type: 'int', nullable: true, comment: '人员类型(1=人,2=公司)' })
  personType?: number;

  @Column({ name: 'base', nullable: true, comment: '地区代码' })
  base?: string;
}

@Entity('business_change_records')
export class BusinessChangeRecord extends BaseEntity {
  @Column({ name: 'business_info_id', type: 'bigint', comment: '工商信息ID' })
  businessInfoId: number;

  @ManyToOne(() => BusinessInfo, (info) => info.changeRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo: BusinessInfo;

  @Column({ name: 'change_date', type: 'date', nullable: true, comment: '变更日期' })
  changeDate?: Date;

  @Column({ name: 'change_item', nullable: true, comment: '变更事项' })
  changeItem?: string;

  @Column({ name: 'before_change', type: 'text', nullable: true, comment: '变更前' })
  beforeChange?: string;

  @Column({ name: 'after_change', type: 'text', nullable: true, comment: '变更后' })
  afterChange?: string;
}

