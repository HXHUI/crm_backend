-- 更新用户表：邮箱改为可选，手机号码改为必填且唯一
-- MySQL 语法：使用 MODIFY COLUMN 而不是 ALTER COLUMN

-- 修改 email 字段为可选（允许 NULL）
ALTER TABLE users 
  MODIFY COLUMN email VARCHAR(255) NULL COMMENT '邮箱（可选）';

-- 修改 phone 字段为必填（NOT NULL）
ALTER TABLE users 
  MODIFY COLUMN phone VARCHAR(20) NOT NULL COMMENT '手机号码（必填，唯一）';

-- 添加手机号码唯一索引
-- 注意：如果索引已存在，CREATE UNIQUE INDEX 会失败
-- 为了幂等性，先尝试删除可能存在的索引（如果不存在会失败，但可以忽略）
-- 使用存储过程来安全地删除索引
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE()
    AND table_name = 'users' 
    AND index_name = 'UQ_users_phone'
);

SET @sql = IF(@index_exists > 0,
  'ALTER TABLE users DROP INDEX UQ_users_phone',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加唯一索引（如果不存在）
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'UQ_users_phone');
SET @sql = IF(@idx_exists = 0, 'CREATE UNIQUE INDEX UQ_users_phone ON users(phone)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
