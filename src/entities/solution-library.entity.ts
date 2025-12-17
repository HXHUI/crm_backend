import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum SolutionResult {
  WON = 'won',
  LOST = 'lost',
  ON_HOLD = 'on_hold',
}

export enum SolutionSourceType {
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
}

export enum WinReason {
  PRICE = 'price',
  TECHNOLOGY = 'technology',
  DELIVERY = 'delivery',
  RELATIONSHIP = 'relationship',
  SERVICE = 'service',
  OTHER = 'other',
}

export enum LoseReason {
  PRICE = 'price',
  TECHNOLOGY = 'technology',
  DELIVERY = 'delivery',
  RELATIONSHIP = 'relationship',
  BUDGET_CHANGE = 'budget_change',
  COMPETITOR = 'competitor',
  OTHER = 'other',
}

export interface ProductListItem {
  productId: number;
  productName?: string;
  spec?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CompetitorInfo {
  id: number;
  manufacturer: string;
  productName?: string;
  annualUsageAmount?: number;
  unit?: string;
  unitPrice?: number;
  policy?: string;
  advantages?: string;
  problems?: string;
}

export interface AlternativeInfo {
  id: number;
  competitorId: number;
  productName: string;
  spec?: string;
  unit?: string;
  unitPrice?: number;
  annualPotentialAmount?: number;
  advantages?: string;
  disadvantages?: string;
  strategy?: string;
  notes?: string;
}

@Entity('solution_library')
export class SolutionLibrary extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  @Index()
  tenantId: number;

  // 关联来源（多态关联）
  @Column({ name: 'source_type', type: 'varchar', length: 50, comment: '来源类型：customer/opportunity' })
  @Index()
  sourceType: SolutionSourceType;

  @Column({ name: 'source_id', type: 'bigint', comment: '来源ID（客户ID或商机ID）' })
  @Index()
  sourceId: number;

  // 方案基本信息
  @Column({ type: 'varchar', length: 200, comment: '方案标题' })
  title: string;

  @Column({ nullable: true, comment: '行业（字典key）' })
  industry?: string;

  @Column({ name: 'customer_type', nullable: true, comment: '客户类型/规模' })
  customerType?: string;

  @Column({ name: 'application_scenario', type: 'varchar', length: 200, nullable: true, comment: '应用场景' })
  applicationScenario?: string;

  // 关联的关键信息
  @Column({ name: 'requirement_tags', type: 'json', nullable: true, comment: '关联的需求标签' })
  requirementTags?: string[];

  @Column({ name: 'competitor_ids', type: 'json', nullable: true, comment: '关联的竞品ID列表' })
  competitorIds?: number[];

  @Column({ name: 'competitors', type: 'json', nullable: true, comment: '竞品详细信息列表' })
  competitors?: CompetitorInfo[];

  @Column({ name: 'alternative_ids', type: 'json', nullable: true, comment: '使用的可替代产品ID列表' })
  alternativeIds?: number[];

  @Column({ name: 'alternatives', type: 'json', nullable: true, comment: '可替代产品详细信息列表' })
  alternatives?: AlternativeInfo[];

  // 方案内容
  @Column({ name: 'product_list', type: 'json', nullable: true, comment: '使用的产品清单' })
  productList?: ProductListItem[];

  @Column({ name: 'pricing_strategy', type: 'text', nullable: true, comment: '价格策略说明' })
  pricingStrategy?: string;

  @Column({ name: 'service_strategy', type: 'text', nullable: true, comment: '服务策略说明' })
  serviceStrategy?: string;

  @Column({ name: 'technical_solution', type: 'text', nullable: true, comment: '技术方案说明' })
  technicalSolution?: string;

  // 结果与复盘
  @Column({ type: 'varchar', length: 20, comment: '结果：won/lost/on_hold' })
  result: SolutionResult;

  @Column({ name: 'win_reasons', type: 'json', nullable: true, comment: '成功原因' })
  winReasons?: WinReason[];

  @Column({ name: 'lose_reasons', type: 'json', nullable: true, comment: '失败原因' })
  loseReasons?: LoseReason[];

  @Column({ name: 'key_feedback', type: 'text', nullable: true, comment: '客户关键反馈' })
  keyFeedback?: string;

  @Column({ name: 'lessons_learned', type: 'text', nullable: true, comment: '经验教训总结' })
  lessonsLearned?: string;

  // 统计与推荐权重
  @Column({ name: 'usage_count', type: 'int', default: 0, comment: '被引用次数' })
  usageCount: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0, comment: '成功率' })
  successRate: number;

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true, comment: '最后使用时间' })
  lastUsedAt?: Date;

  // 元数据
  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者（成员ID）' })
  createdBy?: number;
}

