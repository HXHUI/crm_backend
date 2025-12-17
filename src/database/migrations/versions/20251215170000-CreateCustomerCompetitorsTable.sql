-- 创建 customer_competitors 表（竞品信息，单位：万元）
CREATE TABLE IF NOT EXISTS `customer_competitors` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  `related_type` VARCHAR(50) NOT NULL COMMENT '关联类型：customer/opportunity/contract/order',
  `related_id` BIGINT NOT NULL COMMENT '关联对象ID',
  `manufacturer` VARCHAR(200) NOT NULL COMMENT '竞品厂家',
  `product_name` VARCHAR(200) DEFAULT NULL COMMENT '产品名称',
  `annual_usage_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '年用量（金额），单位：万元',
  `unit` VARCHAR(50) DEFAULT NULL COMMENT '单位',
  `unit_price` DECIMAL(12,2) DEFAULT NULL COMMENT '单价，单位：万元',
  `policy` TEXT DEFAULT NULL COMMENT '政策',
  `advantages` TEXT DEFAULT NULL COMMENT '优势',
  `problems` TEXT DEFAULT NULL COMMENT '存在的问题',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_competitor_related` (`related_type`, `related_id`),
  KEY `idx_competitor_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 迁移 customer_profiles.competitor_brands 到 customer_competitors
INSERT INTO `customer_competitors` (
  `tenant_id`,
  `related_type`,
  `related_id`,
  `manufacturer`,
  `created_at`,
  `updated_at`
)
SELECT
  cp.`tenant_id`,
  'customer' AS related_type,
  cp.`customer_id` AS related_id,
  jt.`brand` AS manufacturer,
  NOW(),
  NOW()
FROM `customer_profiles` cp
JOIN JSON_TABLE(
  cp.`competitor_brands`,
  '$[*]' COLUMNS(
    `brand` VARCHAR(200) PATH '$'
  )
) jt
  ON cp.`competitor_brands` IS NOT NULL
  AND JSON_LENGTH(cp.`competitor_brands`) > 0;

-- 从 customer_profiles 移除旧字段（兼容低版本 MySQL，不使用 IF EXISTS）
SET @has_main_category :=
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'customer_profiles'
     AND COLUMN_NAME = 'main_category_ids');
SET @sql_main := IF(@has_main_category > 0, 'ALTER TABLE `customer_profiles` DROP COLUMN `main_category_ids`;', 'SELECT 1;');
PREPARE stmt_main FROM @sql_main;
EXECUTE stmt_main;
DEALLOCATE PREPARE stmt_main;

SET @has_competitor_brands :=
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'customer_profiles'
     AND COLUMN_NAME = 'competitor_brands');
SET @sql_competitor := IF(@has_competitor_brands > 0, 'ALTER TABLE `customer_profiles` DROP COLUMN `competitor_brands`;', 'SELECT 1;');
PREPARE stmt_competitor FROM @sql_competitor;
EXECUTE stmt_competitor;
DEALLOCATE PREPARE stmt_competitor;

