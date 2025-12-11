-- Migration: AddPriceComponentsToQuoteAndContractItems
-- Description: 为报价明细和合同明细增加 price_components 字段，用于复杂价格模式

-- 1. quote_items.price_components
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'quote_items'
    AND column_name = 'price_components'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE quote_items ADD COLUMN price_components JSON NULL COMMENT ''价格组成项（复杂模式）'' AFTER discount',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. contract_items.price_components
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contract_items'
    AND column_name = 'price_components'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE contract_items ADD COLUMN price_components JSON NULL COMMENT ''价格组成项（复杂模式）'' AFTER discount',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚提示（如需手工回滚，可参考以下语句）：
-- ALTER TABLE quote_items DROP COLUMN price_components;
-- ALTER TABLE contract_items DROP COLUMN price_components;


