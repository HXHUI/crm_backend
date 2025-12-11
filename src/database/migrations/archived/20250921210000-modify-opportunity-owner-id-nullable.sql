-- 删除外键约束（如果存在）
-- 使用存储过程来安全地删除外键
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'opportunities' 
    AND constraint_name = 'FK_cc51e62c9dfa9d01661bc4a4e9c'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE opportunities DROP FOREIGN KEY FK_cc51e62c9dfa9d01661bc4a4e9c',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改opportunities表的ownerId字段为可空
ALTER TABLE opportunities MODIFY COLUMN ownerId VARCHAR(36) NULL COMMENT '负责人ID';

-- 重新添加外键约束
ALTER TABLE opportunities ADD CONSTRAINT FK_opportunities_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL;
