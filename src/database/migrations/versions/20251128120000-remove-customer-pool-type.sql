-- 删除客户池类型字段和索引
-- 移除 pool_type 字段，改为通过 ownerId 判断（有负责人=私海，无负责人=公海）

-- 删除索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'customers' AND index_name = 'idx_customers_pool_type');
SET @sql = IF(@idx_exists > 0, 'DROP INDEX idx_customers_pool_type ON customers', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除字段
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'pool_type');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE customers DROP COLUMN pool_type', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

