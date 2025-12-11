-- Migration: CreateCustomerCreditHistoryTable
-- Version: 20251203111800
-- Description: 创建客户信用变更历史表

-- 创建 customer_credit_history 表
CREATE TABLE IF NOT EXISTS `customer_credit_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT NOT NULL COMMENT '客户ID',
  `old_limit` DECIMAL(10,2) NULL DEFAULT NULL COMMENT '原信用额度',
  `new_limit` DECIMAL(10,2) NULL DEFAULT NULL COMMENT '新信用额度',
  `old_tier` VARCHAR(20) NULL DEFAULT NULL COMMENT '原额度档位',
  `new_tier` VARCHAR(20) NULL DEFAULT NULL COMMENT '新额度档位',
  `old_rating` VARCHAR(10) NULL DEFAULT NULL COMMENT '原客户等级（来自customers.level）',
  `new_rating` VARCHAR(10) NULL DEFAULT NULL COMMENT '新客户等级（来自customers.level）',
  `change_reason` VARCHAR(500) NULL DEFAULT NULL COMMENT '变更原因',
  `changed_by` BIGINT NULL DEFAULT NULL COMMENT '变更人ID（关联members.id）',
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_customer_credit_history_customer_id` (`customer_id`),
  INDEX `idx_customer_credit_history_tenant_id` (`tenant_id`),
  INDEX `idx_customer_credit_history_created_at` (`created_at`),
  CONSTRAINT `fk_customer_credit_history_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_customer_credit_history_member` FOREIGN KEY (`changed_by`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信用变更历史表';

-- 回滚语句
-- DROP TABLE IF EXISTS `customer_credit_history`;

