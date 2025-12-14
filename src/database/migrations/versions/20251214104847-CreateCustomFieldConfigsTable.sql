-- 创建扩展字段配置表
-- Migration: Create custom field configs table
-- Date: 2025-12-14
-- Description: 创建扩展字段配置表，支持租户自定义实体扩展字段

CREATE TABLE IF NOT EXISTS `custom_field_configs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL COMMENT '租户ID（必填，支持租户隔离）',
  `entity_type` VARCHAR(50) NOT NULL DEFAULT 'customer' COMMENT '实体类型（默认customer，未来可扩展到contact/opportunity等）',
  `field_code` VARCHAR(100) NOT NULL COMMENT '字段编码（在租户内唯一）',
  `field_name` VARCHAR(100) NOT NULL COMMENT '字段名称',
  `field_type` ENUM('text', 'number', 'date', 'datetime', 'select', 'multiselect', 'textarea', 'boolean', 'file') NOT NULL COMMENT '字段类型',
  `field_options` JSON NULL COMMENT '字段选项（用于select/multiselect，存储选项列表或字典类型）',
  `is_required` BOOLEAN DEFAULT FALSE COMMENT '是否必填',
  `default_value` TEXT NULL COMMENT '默认值',
  `placeholder` VARCHAR(255) NULL COMMENT '占位符',
  `help_text` VARCHAR(500) NULL COMMENT '帮助文本',
  `validation_rules` JSON NULL COMMENT '验证规则（如：min/max, pattern等）',
  `display_order` INT DEFAULT 0 COMMENT '显示顺序',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `group_name` VARCHAR(100) NULL COMMENT '分组名称（用于UI分组显示）',
  `created_by` BIGINT NULL COMMENT '创建者ID（成员ID）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_custom_field_configs_tenant_entity_code` (`tenant_id`, `entity_type`, `field_code`),
  INDEX `idx_custom_field_configs_tenant_entity` (`tenant_id`, `entity_type`),
  INDEX `idx_custom_field_configs_field_code` (`field_code`),
  INDEX `idx_custom_field_configs_is_active` (`is_active`),
  INDEX `idx_custom_field_configs_display_order` (`display_order`),
  INDEX `idx_custom_field_configs_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_custom_field_configs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_custom_field_configs_created_by` FOREIGN KEY (`created_by`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩展字段配置表';

