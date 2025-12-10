-- Migration: RemoveVisitActivityId
-- Version: 20250120000000
-- Description: 移除拜访表中的 activity_id 字段及其外键约束

-- 1. 检查并删除外键约束（如果存在）
-- 通过查询 KEY_COLUMN_USAGE 来找到引用 activity_id 列的外键约束
SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE table_schema = DATABASE() 
    AND table_name = 'visits' 
    AND column_name = 'activity_id'
    AND referenced_table_name IS NOT NULL
  LIMIT 1
);

-- 如果找到外键约束，则删除它
SET @sql = IF(@fk_name IS NOT NULL, 
  CONCAT('ALTER TABLE visits DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1 AS "No foreign key found";');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 删除 activity_id 列（如果存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'activity_id');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN activity_id;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要回滚，需要手动恢复字段和外键）
-- ALTER TABLE visits ADD COLUMN activity_id BIGINT NULL COMMENT '关联活动ID' AFTER opportunity_id;
-- ALTER TABLE visits ADD CONSTRAINT fk_visits_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL;

