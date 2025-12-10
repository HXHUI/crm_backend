-- Migration: CreateCustomerProfilesTable
-- Version: 20251203111700
-- Description: 创建客户合作习惯与信用信息扩展表

-- 创建 customer_profiles 表
CREATE TABLE IF NOT EXISTS `customer_profiles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT NOT NULL COMMENT '客户ID',
  `invoice_requirement` ENUM('special_vat', 'normal_invoice', 'no_invoice') NULL DEFAULT NULL COMMENT '开票要求：专票/普票/不开票',
  `invoice_remark` VARCHAR(500) NULL DEFAULT NULL COMMENT '开票说明',
  `shipping_methods` JSON NULL DEFAULT NULL COMMENT '货运方式数组：专车/物流/自提/快递',
  `main_category_ids` JSON NULL DEFAULT NULL COMMENT '主要采购品类ID数组（关联dict_items.id）',
  `competitor_brands` JSON NULL DEFAULT NULL COMMENT '意向竞品品牌数组',
  `credit_limit` DECIMAL(10,2) NULL DEFAULT NULL COMMENT '信用额度（元）',
  `credit_tier` ENUM('tier_150k', 'tier_100k', 'tier_50k', 'none') NULL DEFAULT NULL COMMENT '信用额度档位：15万/10万/5万/无',
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_profiles_customer_id` (`customer_id`),
  INDEX `idx_customer_profiles_tenant_id` (`tenant_id`),
  INDEX `idx_customer_profiles_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_customer_profiles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户合作习惯与信用信息扩展表';

-- 回滚语句
-- DROP TABLE IF EXISTS `customer_profiles`;

