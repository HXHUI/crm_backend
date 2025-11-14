-- Migration: AddCustomerTags
-- Version: 20250922000000
-- Description: 添加客户标签功能（调用已存在的 SQL 迁移文件）

-- 注意：此迁移与 20250920195413-add-customer-tags-fixed.sql 功能相同
-- 如果 20250920195413 已执行，此迁移将不会重复执行（因为版本号检查）

-- 回滚语句
-- DROP TABLE IF EXISTS customer_tag_relations;
-- DROP TABLE IF EXISTS customer_tags;

