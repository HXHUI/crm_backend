-- 添加拜访准备字段到visits表
-- 创建时间: 2025-12-15 16:08:01

-- 添加preparation字段（JSON类型，存储字典值数组）
ALTER TABLE visits
ADD COLUMN preparation JSON NULL COMMENT '拜访准备（字典值数组）' AFTER purpose;

