-- 添加系统管理员字段到用户表
-- 迁移版本: 20251211222931
-- 描述: 为 users 表添加 is_system_admin 字段，用于区分系统管理员和租户用户

ALTER TABLE users 
ADD COLUMN is_system_admin BOOLEAN DEFAULT FALSE COMMENT '是否为系统管理员' AFTER status;

-- 创建索引（可选，如果需要按系统管理员查询）
CREATE INDEX idx_users_is_system_admin ON users(is_system_admin);

