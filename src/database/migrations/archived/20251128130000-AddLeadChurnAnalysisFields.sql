-- 添加线索流失分析字段
-- 检查字段是否存在，如果不存在则添加

-- 添加不合格原因字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'unqualified_reason'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN unqualified_reason VARCHAR(50) NULL COMMENT ''不合格原因（字典key）''', 
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加不合格时间字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'unqualified_at'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN unqualified_at DATETIME NULL COMMENT ''不合格时间''', 
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加流失阶段字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'lost_stage'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN lost_stage VARCHAR(20) NULL COMMENT ''流失阶段''', 
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加流失类型字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'leads' 
    AND COLUMN_NAME = 'lost_type'
);

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE leads ADD COLUMN lost_type VARCHAR(20) NULL COMMENT ''流失类型（字典key）''', 
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

