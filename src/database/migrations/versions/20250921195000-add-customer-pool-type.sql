-- 添加客户池类型字段
ALTER TABLE customers ADD COLUMN pool_type ENUM('public', 'private') NOT NULL DEFAULT 'private' COMMENT '客户池类型';
