-- 删除外键约束（如果存在）
-- 使用存储过程来安全地删除外键
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'customers' 
    AND constraint_name = 'FK_e272f7a6dd948d44fe4ea097452'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE customers DROP FOREIGN KEY FK_e272f7a6dd948d44fe4ea097452',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改ownerId为可空字段
ALTER TABLE customers MODIFY COLUMN ownerId VARCHAR(36) NULL COMMENT '所属成员ID';

-- 重新添加外键约束
ALTER TABLE customers ADD CONSTRAINT FK_customers_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL;
