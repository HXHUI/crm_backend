-- 迁移：为 quote_items/contract_items/order_items 表增加包装单位和包装规格字段
-- 版本：20251203120310
-- 描述：支持在报价/合同/订单明细项中使用包装单位显示，所有数值字段仍按主单位存储

-- -------------------------------------------------------------------
-- 1. 为 quote_items 表增加包装字段
-- -------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quote_items' AND column_name = 'packaging_unit'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE quote_items ADD COLUMN packaging_unit VARCHAR(50) NULL COMMENT ''包装单位（显示用）'' AFTER quantity',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quote_items' AND column_name = 'packaging_spec'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE quote_items ADD COLUMN packaging_spec VARCHAR(200) NULL COMMENT ''包装规格说明（显示用，如：1袋=25kg）'' AFTER packaging_unit',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------
-- 2. 为 contract_items 表增加包装字段
-- -------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'contract_items' AND column_name = 'packaging_unit'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE contract_items ADD COLUMN packaging_unit VARCHAR(50) NULL COMMENT ''包装单位（显示用）'' AFTER quantity',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'contract_items' AND column_name = 'packaging_spec'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE contract_items ADD COLUMN packaging_spec VARCHAR(200) NULL COMMENT ''包装规格说明（显示用，如：1袋=25kg）'' AFTER packaging_unit',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------
-- 3. 为 order_items 表增加包装字段
-- -------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'packaging_unit'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE order_items ADD COLUMN packaging_unit VARCHAR(50) NULL COMMENT ''包装单位（显示用）'' AFTER quantity',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'packaging_spec'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE order_items ADD COLUMN packaging_spec VARCHAR(200) NULL COMMENT ''包装规格说明（显示用，如：1袋=25kg）'' AFTER packaging_unit',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

