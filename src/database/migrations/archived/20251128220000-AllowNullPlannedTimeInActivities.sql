-- Migration: AllowNullPlannedTimeInActivities
-- Version: 20251128220000
-- Description: 允许 activities 表的 planned_start_time 和 planned_end_time 字段为 NULL

-- 修改 planned_start_time 字段，允许为 NULL
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND column_name = 'planned_start_time'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE activities MODIFY COLUMN planned_start_time DATETIME NULL COMMENT ''计划开始时间''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改 planned_end_time 字段，允许为 NULL
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND column_name = 'planned_end_time'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE activities MODIFY COLUMN planned_end_time DATETIME NULL COMMENT ''计划结束时间''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE activities MODIFY COLUMN planned_start_time DATETIME NOT NULL COMMENT '计划开始时间';
-- ALTER TABLE activities MODIFY COLUMN planned_end_time DATETIME NOT NULL COMMENT '计划结束时间';

