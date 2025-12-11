-- Migration: AddParentIdToContacts
-- Version: 20251118005337
-- Description: 在联系人表中添加上级联系人ID字段，支持联系人层级关系

-- 添加上级联系人ID字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contacts' 
  AND column_name = 'parent_id');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE contacts ADD COLUMN parent_id BIGINT NULL COMMENT ''上级联系人ID'' AFTER customer_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contacts' 
  AND index_name = 'idx_contacts_parent_id');
SET @sql = IF(@idx_exists = 0, 
  'CREATE INDEX idx_contacts_parent_id ON contacts (parent_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加外键约束（自引用）
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'contacts' 
  AND constraint_name = 'fk_contacts_parent' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE contacts ADD CONSTRAINT fk_contacts_parent FOREIGN KEY (parent_id) REFERENCES contacts(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_parent;
-- DROP INDEX idx_contacts_parent_id ON contacts;
-- ALTER TABLE contacts DROP COLUMN parent_id;

