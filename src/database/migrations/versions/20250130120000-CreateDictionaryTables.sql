-- Migration: CreateDictionaryTables
-- Version: 20250130120000
-- Description: 创建通用数据字典表（字典类型表、字典项表）

-- 创建字典类型表
CREATE TABLE IF NOT EXISTS `dict_types` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID（NULL为系统级）',
  `code` VARCHAR(100) NOT NULL COMMENT '字典类型编码（在租户内唯一）',
  `name` VARCHAR(100) NOT NULL COMMENT '字典类型名称',
  `description` TEXT NULL DEFAULT NULL COMMENT '描述',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_types_tenant_code` (`tenant_id`, `code`),
  INDEX `idx_dict_types_tenant_id` (`tenant_id`),
  INDEX `idx_dict_types_code` (`code`),
  INDEX `idx_dict_types_status` (`status`),
  INDEX `idx_dict_types_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

-- 创建字典项表
CREATE TABLE IF NOT EXISTS `dict_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID（NULL为系统级）',
  `type_code` VARCHAR(100) NOT NULL COMMENT '字典类型编码',
  `value` VARCHAR(100) NOT NULL COMMENT '编码值，用于业务逻辑和拼接',
  `label` VARCHAR(200) NOT NULL COMMENT '显示名称',
  `parent_id` BIGINT NULL DEFAULT NULL COMMENT '父级字典项ID，用于层级结构',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态：active/inactive',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_items_tenant_type_value` (`tenant_id`, `type_code`, `value`),
  INDEX `idx_dict_items_tenant_id` (`tenant_id`),
  INDEX `idx_dict_items_type_code` (`type_code`),
  INDEX `idx_dict_items_parent_id` (`parent_id`),
  INDEX `idx_dict_items_status` (`status`),
  INDEX `idx_dict_items_deleted_at` (`deleted_at`),
  INDEX `idx_dict_items_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- 回滚语句
-- DROP TABLE IF EXISTS `dict_items`;
-- DROP TABLE IF EXISTS `dict_types`;

