-- 迁移：为报价/合同/订单及其明细增加税率与税金相关字段
-- 版本：20251203120210

-- quote_items: 明细级税字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quote_items' AND column_name = 'tax_rate'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE quote_items
     ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''税率(%)'' AFTER unit_price,
     ADD COLUMN unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税单价'' AFTER tax_rate,
     ADD COLUMN amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税金额'' AFTER amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金'' AFTER amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- contract_items: 明细级税字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'contract_items' AND column_name = 'tax_rate'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE contract_items
     ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''税率(%)'' AFTER unit_price,
     ADD COLUMN unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税单价'' AFTER tax_rate,
     ADD COLUMN amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税金额'' AFTER amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金'' AFTER amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- order_items: 明细级税字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'tax_rate'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE order_items
     ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''税率(%)'' AFTER unit_price,
     ADD COLUMN unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税单价'' AFTER tax_rate,
     ADD COLUMN amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税金额'' AFTER amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金'' AFTER amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotes: 主表税汇总字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'quotes' AND column_name = 'tax_amount'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE quotes
     ADD COLUMN total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税总金额'' AFTER total_amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金合计'' AFTER total_amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- contracts: 主表税汇总字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'contracts' AND column_name = 'tax_amount'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE contracts
     ADD COLUMN total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税总金额'' AFTER total_amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金合计'' AFTER total_amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- orders: 主表税汇总字段
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'tax_amount'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders
     ADD COLUMN total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''不含税总金额'' AFTER total_amount,
     ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''税金合计'' AFTER total_amount_excl_tax',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


