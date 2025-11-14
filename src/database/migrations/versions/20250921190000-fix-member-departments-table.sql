-- 修复 member_departments 表：移除 id 字段，使用复合主键
-- 注意：如果表结构已正确，这些语句可能会失败，但可以忽略

-- 删除主键（如果存在）
-- 注意：如果表没有主键或主键不同，此语句会失败
ALTER TABLE `member_departments` DROP PRIMARY KEY;

-- 删除 id 字段（如果存在）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND column_name = 'id'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE member_departments DROP COLUMN id',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加复合主键
ALTER TABLE `member_departments` ADD PRIMARY KEY (`memberId`, `departmentId`);
