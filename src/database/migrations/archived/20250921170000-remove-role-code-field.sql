-- 20250921170000-remove-role-code-field.sql
-- 移除角色表中的code字段

-- Up Migration
-- 检查字段是否存在，如果存在则删除
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'roles' 
    AND column_name = 'code'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE roles DROP COLUMN code',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Down Migration
ALTER TABLE `roles` ADD COLUMN `code` VARCHAR(50) NULL COMMENT '角色编码';
