-- 添加线索流失分析字段到 leads 表
-- 迁移版本: 20251211225542
-- 描述: 为 leads 表添加流失分析相关字段（unqualified_reason, unqualified_at, lost_stage, lost_type）

-- 检查并添加不合格原因字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'unqualified_reason'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN unqualified_reason VARCHAR(50) NULL COMMENT ''不合格原因（字典key）'' AFTER address_detail', 
  'SELECT 1 AS ''字段 unqualified_reason 已存在'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加不合格时间字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'unqualified_at'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN unqualified_at DATETIME NULL COMMENT ''不合格时间'' AFTER unqualified_reason', 
  'SELECT 1 AS ''字段 unqualified_at 已存在'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加流失阶段字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'lost_stage'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN lost_stage VARCHAR(20) NULL COMMENT ''流失阶段'' AFTER unqualified_at', 
  'SELECT 1 AS ''字段 lost_stage 已存在'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加流失类型字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'lost_type'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN lost_type VARCHAR(20) NULL COMMENT ''流失类型（字典key）'' AFTER lost_stage', 
  'SELECT 1 AS ''字段 lost_type 已存在'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 输出完成信息
SELECT '✓ 线索流失分析字段添加完成' AS message;

