-- Migration: AddTenantHierarchyFields
-- Version: 20250120120000
-- Description: 在租户表中添加集团层级关系字段（parent_id, type, level）

-- 添加 parent_id 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND column_name = 'parent_id');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tenants ADD COLUMN parent_id BIGINT NULL COMMENT ''父租户ID（集团层级关系）'' AFTER config', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 type 字段（枚举类型）
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND column_name = 'type');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tenants ADD COLUMN type ENUM(''group'', ''subsidiary'', ''standard'') NOT NULL DEFAULT ''standard'' COMMENT ''租户类型：group=集团, subsidiary=子公司, standard=普通租户'' AFTER parent_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 level 字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND column_name = 'level');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tenants ADD COLUMN level INT NOT NULL DEFAULT 0 COMMENT ''层级深度（0为顶级）'' AFTER type', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 parent_id 索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND index_name = 'idx_tenants_parent_id');
SET @sql = IF(@idx_exists = 0, 
  'CREATE INDEX idx_tenants_parent_id ON tenants (parent_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 type 索引（用于快速查询集团租户）
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND index_name = 'idx_tenants_type');
SET @sql = IF(@idx_exists = 0, 
  'CREATE INDEX idx_tenants_type ON tenants (type)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加外键约束（自引用）
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'tenants' 
  AND constraint_name = 'fk_tenants_parent' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE tenants ADD CONSTRAINT fk_tenants_parent FOREIGN KEY (parent_id) REFERENCES tenants(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE tenants DROP FOREIGN KEY fk_tenants_parent;
-- DROP INDEX idx_tenants_type ON tenants;
-- DROP INDEX idx_tenants_parent_id ON tenants;
-- ALTER TABLE tenants DROP COLUMN level;
-- ALTER TABLE tenants DROP COLUMN type;
-- ALTER TABLE tenants DROP COLUMN parent_id;

