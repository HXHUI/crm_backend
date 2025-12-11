-- 为产品表添加动态分类字段（JSON格式）
-- Migration: Add category_fields column to products table
-- Date: 2025-01-31

-- 添加 category_fields 字段
ALTER TABLE `products`
ADD COLUMN `category_fields` JSON NULL COMMENT '动态分类字段（JSON格式，存储配置的分类字段值）' AFTER `description`;

-- 更新现有数据：如果有 category 字段值，可以迁移到 category_fields（可选）
-- 注意：这个迁移是可选的，因为旧数据可能没有对应的分类字段配置
-- UPDATE `products` SET `category_fields` = JSON_OBJECT('category', `category`) WHERE `category` IS NOT NULL AND `category_fields` IS NULL;

