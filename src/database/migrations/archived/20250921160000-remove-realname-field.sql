-- 20250921160000-remove-realname-field.sql
-- 移除用户表中的realName字段

-- Up Migration
-- 检查字段是否存在，如果存在则删除
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'users' 
    AND column_name = 'realName'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE users DROP COLUMN realName',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Down Migration
ALTER TABLE `users` ADD COLUMN `realName` VARCHAR(255) NULL COMMENT '真实姓名';
