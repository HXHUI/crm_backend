-- Migration: AddDepartmentIdToBusinessTables
-- Version: 20250130000000
-- Description: 为业务表添加 department_id 字段，用于目标统计

-- leads 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER owner_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'leads' AND index_name = 'idx_leads_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_leads_department_id ON leads (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- customers 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER ownerId', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'customers' AND index_name = 'idx_customers_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_customers_department_id ON customers (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- contacts 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contacts' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE contacts ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'contacts' AND index_name = 'idx_contacts_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_contacts_department_id ON contacts (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- opportunities 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'opportunities' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE opportunities ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'opportunities' AND index_name = 'idx_opportunities_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_opportunities_department_id ON opportunities (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- activities 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER owner_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'activities' AND index_name = 'idx_activities_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_activities_department_id ON activities (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- visits 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'visits' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE visits ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'visits' AND index_name = 'idx_visits_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_visits_department_id ON visits (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotes 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'quotes' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE quotes ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'quotes' AND index_name = 'idx_quotes_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_quotes_department_id ON quotes (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- contracts 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contracts' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE contracts ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'contracts' AND index_name = 'idx_contracts_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_contracts_department_id ON contracts (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- orders 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE orders ADD COLUMN department_id BIGINT NULL COMMENT ''部门ID'' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_department_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_orders_department_id ON orders (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要回滚）
-- DROP INDEX idx_orders_department_id ON orders;
-- ALTER TABLE orders DROP COLUMN department_id;
-- DROP INDEX idx_contracts_department_id ON contracts;
-- ALTER TABLE contracts DROP COLUMN department_id;
-- DROP INDEX idx_quotes_department_id ON quotes;
-- ALTER TABLE quotes DROP COLUMN department_id;
-- DROP INDEX idx_visits_department_id ON visits;
-- ALTER TABLE visits DROP COLUMN department_id;
-- DROP INDEX idx_activities_department_id ON activities;
-- ALTER TABLE activities DROP COLUMN department_id;
-- DROP INDEX idx_opportunities_department_id ON opportunities;
-- ALTER TABLE opportunities DROP COLUMN department_id;
-- DROP INDEX idx_contacts_department_id ON contacts;
-- ALTER TABLE contacts DROP COLUMN department_id;
-- DROP INDEX idx_customers_department_id ON customers;
-- ALTER TABLE customers DROP COLUMN department_id;
-- DROP INDEX idx_leads_department_id ON leads;
-- ALTER TABLE leads DROP COLUMN department_id;

