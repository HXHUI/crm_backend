-- 迁移：为 tenants 表增加默认税率字段
-- 版本：20251203120220

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'tenants' AND column_name = 'default_tax_rate'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE tenants ADD COLUMN default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''默认税率(%)'' AFTER config',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


