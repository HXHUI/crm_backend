-- 20250921180000-remove-role-sort-field.sql
-- 移除角色表中的sort字段

-- Up Migration
-- 检查字段是否存在，如果存在则删除
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'roles' 
    AND column_name = 'sort'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE roles DROP COLUMN sort',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Down Migration
ALTER TABLE `roles` ADD COLUMN `sort` INT DEFAULT 0 COMMENT '排序';
