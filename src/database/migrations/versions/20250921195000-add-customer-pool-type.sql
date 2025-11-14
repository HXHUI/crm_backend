-- 添加客户池类型字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'pool_type');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN pool_type ENUM(\'public\', \'private\') NOT NULL DEFAULT \'private\' COMMENT \'客户池类型\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
