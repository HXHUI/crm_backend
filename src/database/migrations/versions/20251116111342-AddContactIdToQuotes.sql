-- Migration: AddContactIdToQuotes
-- Version: 20251116111342
-- Description: 在报价表中添加联系人ID字段

-- 添加联系人ID字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'quotes' 
  AND column_name = 'contact_id');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE quotes ADD COLUMN contact_id BIGINT NULL COMMENT ''联系人ID'' AFTER customer_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'quotes' 
  AND index_name = 'idx_quotes_contact_id');
SET @sql = IF(@idx_exists = 0, 
  'CREATE INDEX idx_quotes_contact_id ON quotes (contact_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'quotes' 
  AND constraint_name = 'fk_quotes_contact' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE quotes ADD CONSTRAINT fk_quotes_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE quotes DROP FOREIGN KEY fk_quotes_contact;
-- DROP INDEX idx_quotes_contact_id ON quotes;
-- ALTER TABLE quotes DROP COLUMN contact_id;

