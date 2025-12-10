-- Migration: AddPriceComponentsToOrderItems
-- Version: 20251125000000
-- Description: 添加价格组成字段到订单明细表，支持可配置的价格计算模式

-- 添加 price_components JSON 字段到 order_items 表（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'order_items' 
  AND column_name = 'price_components');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE order_items ADD COLUMN price_components JSON NULL COMMENT ''价格组成项（复杂模式下的价格组成）'' AFTER unit_price;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要回滚）
-- ALTER TABLE order_items DROP COLUMN price_components;

