-- Migration: InitProductCategoryDictionary
-- Version: 20251203111900
-- Description: 初始化产品品类字典数据

-- 插入字典类型：产品品类
INSERT INTO `dict_types` (`code`, `name`, `description`, `status`, `created_at`, `updated_at`)
SELECT 'product_category', '产品品类', '客户主要采购的产品品类', 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_types` WHERE `code` = 'product_category'
);

-- 获取刚插入的字典类型ID（如果已存在则获取现有ID）
SET @dict_type_id = (SELECT `id` FROM `dict_types` WHERE `code` = 'product_category' LIMIT 1);

-- 插入示例品类项
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_category', 'hot_melt', '热熔类', 1, 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_category' AND `value` = 'hot_melt'
);

INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_category', 'rongyao', '容槽物料', 2, 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_category' AND `value` = 'rongyao'
);

-- 回滚语句
-- DELETE FROM `dict_items` WHERE `type_code` = 'product_category';
-- DELETE FROM `dict_types` WHERE `code` = 'product_category';

