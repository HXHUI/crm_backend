-- Migration: AddCreatedByToAllTables
-- Version: 20251205000000
-- Description: 为所有业务表添加创建者字段（created_by）

-- 为线索表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'leads' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE leads ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER lost_type', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为线索表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'leads' 
  AND constraint_name = 'fk_leads_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE leads ADD CONSTRAINT fk_leads_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为客户表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'customers' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE customers ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER tenant_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为客户表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'customers' 
  AND constraint_name = 'fk_customers_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE customers ADD CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为联系人表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contacts' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE contacts ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为联系人表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contacts' 
  AND constraint_name = 'fk_contacts_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE contacts ADD CONSTRAINT fk_contacts_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为商机表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'opportunities' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE opportunities ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为商机表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'opportunities' 
  AND constraint_name = 'fk_opportunities_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为活动表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'activities' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE activities ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER tenant_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为活动表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'activities' 
  AND constraint_name = 'fk_activities_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE activities ADD CONSTRAINT fk_activities_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为拜访表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE visits ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为拜访表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND constraint_name = 'fk_visits_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE visits ADD CONSTRAINT fk_visits_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为产品表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'products' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER tenant_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为产品表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'products' 
  AND constraint_name = 'fk_products_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE products ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为报价表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'quotes' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE quotes ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为报价表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'quotes' 
  AND constraint_name = 'fk_quotes_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE quotes ADD CONSTRAINT fk_quotes_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为合同表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contracts' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE contracts ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为合同表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contracts' 
  AND constraint_name = 'fk_contracts_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE contracts ADD CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为订单表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE orders ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER department_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为订单表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND constraint_name = 'fk_orders_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为部门表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'departments' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE departments ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER sort', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为部门表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'departments' 
  AND constraint_name = 'fk_departments_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE departments ADD CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为角色表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'roles' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE roles ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（成员ID）'' AFTER tenant_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为角色表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'roles' 
  AND constraint_name = 'fk_roles_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为用户表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（用户ID，系统管理员创建）'' AFTER last_login_ip', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为用户表添加外键约束（自引用）
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND constraint_name = 'fk_users_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为租户表添加 created_by 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND column_name = 'created_by');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tenants ADD COLUMN created_by BIGINT NULL COMMENT ''创建者ID（用户ID）'' AFTER level', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为租户表添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND constraint_name = 'fk_tenants_created_by' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要）
-- ALTER TABLE leads DROP FOREIGN KEY fk_leads_created_by;
-- ALTER TABLE leads DROP COLUMN created_by;
-- ALTER TABLE customers DROP FOREIGN KEY fk_customers_created_by;
-- ALTER TABLE customers DROP COLUMN created_by;
-- ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_created_by;
-- ALTER TABLE contacts DROP COLUMN created_by;
-- ALTER TABLE opportunities DROP FOREIGN KEY fk_opportunities_created_by;
-- ALTER TABLE opportunities DROP COLUMN created_by;
-- ALTER TABLE activities DROP FOREIGN KEY fk_activities_created_by;
-- ALTER TABLE activities DROP COLUMN created_by;
-- ALTER TABLE visits DROP FOREIGN KEY fk_visits_created_by;
-- ALTER TABLE visits DROP COLUMN created_by;
-- ALTER TABLE products DROP FOREIGN KEY fk_products_created_by;
-- ALTER TABLE products DROP COLUMN created_by;
-- ALTER TABLE quotes DROP FOREIGN KEY fk_quotes_created_by;
-- ALTER TABLE quotes DROP COLUMN created_by;
-- ALTER TABLE contracts DROP FOREIGN KEY fk_contracts_created_by;
-- ALTER TABLE contracts DROP COLUMN created_by;
-- ALTER TABLE orders DROP FOREIGN KEY fk_orders_created_by;
-- ALTER TABLE orders DROP COLUMN created_by;
-- ALTER TABLE departments DROP FOREIGN KEY fk_departments_created_by;
-- ALTER TABLE departments DROP COLUMN created_by;
-- ALTER TABLE roles DROP FOREIGN KEY fk_roles_created_by;
-- ALTER TABLE roles DROP COLUMN created_by;
-- ALTER TABLE users DROP FOREIGN KEY fk_users_created_by;
-- ALTER TABLE users DROP COLUMN created_by;
-- ALTER TABLE tenants DROP FOREIGN KEY fk_tenants_created_by;
-- ALTER TABLE tenants DROP COLUMN created_by;

