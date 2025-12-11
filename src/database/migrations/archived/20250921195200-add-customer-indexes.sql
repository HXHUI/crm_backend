-- 添加索引（如果不存在）
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'customers' AND index_name = 'idx_customers_pool_type');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_customers_pool_type ON customers(pool_type)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'customers' AND index_name = 'idx_customers_owner_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_customers_owner_id ON customers(ownerId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
