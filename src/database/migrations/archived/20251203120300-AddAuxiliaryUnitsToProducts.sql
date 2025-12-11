-- 迁移：为 products 表增加辅助计量单位配置字段
-- 版本：20251203120300
-- 描述：支持产品配置多个辅助计量单位，用于报价、合同、订单的包装单位显示

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'auxiliary_units'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN auxiliary_units JSON NULL COMMENT ''辅助计量单位配置（JSON数组，格式：[{unit, conversionRate, purpose, description}]）'' AFTER unit',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

