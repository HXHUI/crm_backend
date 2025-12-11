-- Migration: AddTenantIdToCoreTables
-- Version: 20250922103000
-- Description: 为核心业务表添加 tenant_id 字段

-- customers 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'tenant_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT \'租户ID\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'customers' AND index_name = 'idx_customers_tenant_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_customers_tenant_id ON customers (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'customers' AND constraint_name = 'fk_customers_tenant' AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE customers ADD CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- contacts 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contacts' AND column_name = 'tenant_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE contacts ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT \'租户ID\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'contacts' AND index_name = 'idx_contacts_tenant_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_contacts_tenant_id ON contacts (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'contacts' AND constraint_name = 'fk_contacts_tenant' AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE contacts ADD CONSTRAINT fk_contacts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- opportunities 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'opportunities' AND column_name = 'tenant_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE opportunities ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT \'租户ID\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'opportunities' AND index_name = 'idx_opportunities_tenant_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_opportunities_tenant_id ON opportunities (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'opportunities' AND constraint_name = 'fk_opportunities_tenant' AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- activities 表
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'tenant_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT \'租户ID\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'activities' AND index_name = 'idx_activities_tenant_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_activities_tenant_id ON activities (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'activities' AND constraint_name = 'fk_activities_tenant' AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE activities ADD CONSTRAINT fk_activities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE activities DROP FOREIGN KEY fk_activities_tenant;
-- DROP INDEX idx_activities_tenant_id ON activities;
-- ALTER TABLE activities DROP COLUMN tenant_id;
-- ALTER TABLE opportunities DROP FOREIGN KEY fk_opportunities_tenant;
-- DROP INDEX idx_opportunities_tenant_id ON opportunities;
-- ALTER TABLE opportunities DROP COLUMN tenant_id;
-- ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_tenant;
-- DROP INDEX idx_contacts_tenant_id ON contacts;
-- ALTER TABLE contacts DROP COLUMN tenant_id;
-- ALTER TABLE customers DROP FOREIGN KEY fk_customers_tenant;
-- DROP INDEX idx_customers_tenant_id ON customers;
-- ALTER TABLE customers DROP COLUMN tenant_id;

