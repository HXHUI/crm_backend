import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Member } from './member.entity';

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  TEXTAREA = 'textarea',
  BOOLEAN = 'boolean',
  FILE = 'file',
}

export enum EntityType {
  CUSTOMER = 'customer',
  CONTACT = 'contact',
  OPPORTUNITY = 'opportunity',
}

// 字段选项接口（用于select/multiselect）
export interface FieldOptions {
  // 选项来源类型：'manual' 手动输入选项，'dict' 关联字典
  sourceType?: 'manual' | 'dict';
  // 手动输入的选项列表
  options?: Array<{ label: string; value: string }>;
  // 关联的字典类型编码（当sourceType为'dict'时使用）
  dictTypeCode?: string;
}

// 验证规则接口
export interface ValidationRules {
  min?: number; // 最小值（用于number类型）
  max?: number; // 最大值（用于number类型）
  minLength?: number; // 最小长度（用于text/textarea类型）
  maxLength?: number; // 最大长度（用于text/textarea类型）
  pattern?: string; // 正则表达式（用于text类型）
  message?: string; // 验证失败时的错误消息
}

@Entity('custom_field_configs')
export class CustomFieldConfig extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID（必填，支持租户隔离）' })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 50,
    default: EntityType.CUSTOMER,
    comment: '实体类型（默认customer，未来可扩展到contact/opportunity等）',
  })
  entityType: EntityType;

  @Column({ name: 'field_code', type: 'varchar', length: 100, comment: '字段编码（在租户内唯一）' })
  fieldCode: string;

  @Column({ name: 'field_name', type: 'varchar', length: 100, comment: '字段名称' })
  fieldName: string;

  @Column({
    name: 'field_type',
    type: 'enum',
    enum: CustomFieldType,
    comment: '字段类型',
  })
  fieldType: CustomFieldType;

  @Column({
    name: 'field_options',
    type: 'json',
    nullable: true,
    comment: '字段选项（用于select/multiselect，存储选项列表或字典类型）',
  })
  fieldOptions?: FieldOptions;

  @Column({ name: 'is_required', type: 'boolean', default: false, comment: '是否必填' })
  isRequired: boolean;

  @Column({ name: 'default_value', type: 'text', nullable: true, comment: '默认值' })
  defaultValue?: string;

  @Column({ name: 'placeholder', type: 'varchar', length: 255, nullable: true, comment: '占位符' })
  placeholder?: string;

  @Column({ name: 'help_text', type: 'varchar', length: 500, nullable: true, comment: '帮助文本' })
  helpText?: string;

  @Column({
    name: 'validation_rules',
    type: 'json',
    nullable: true,
    comment: '验证规则（如：min/max, pattern等）',
  })
  validationRules?: ValidationRules;

  @Column({ name: 'display_order', type: 'int', default: 0, comment: '显示顺序' })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true, comment: '分组名称（用于UI分组显示）' })
  groupName?: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}

