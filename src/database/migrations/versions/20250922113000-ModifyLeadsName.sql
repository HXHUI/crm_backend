-- Migration: ModifyLeadsName
-- Version: 20250922113000
-- Description: 修改 leads 表，将 first_name 和 last_name 合并为 name 字段

-- 新增 name 字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'name');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN name VARCHAR(100) NULL COMMENT \'姓名\' AFTER tenant_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 用 first_name + last_name 回填 name（如果存在）
UPDATE leads 
SET name = TRIM(CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,''))) 
WHERE (first_name IS NOT NULL OR last_name IS NOT NULL) 
  AND (name IS NULL OR name = '');

-- 删除 first_name / last_name（如果存在）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'leads' 
    AND column_name = 'first_name'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE leads DROP COLUMN first_name',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'leads' 
    AND column_name = 'last_name'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE leads DROP COLUMN last_name',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE leads ADD COLUMN first_name VARCHAR(50) NULL;
-- ALTER TABLE leads ADD COLUMN last_name VARCHAR(50) NULL;
-- UPDATE leads 
-- SET first_name = SUBSTRING_INDEX(name,' ',1), 
--     last_name = TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name,' ',1)) + 1)) 
-- WHERE name IS NOT NULL;
-- ALTER TABLE leads DROP COLUMN name;

