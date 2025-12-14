-- 初始化产品单位字典（系统级别）
-- Migration: Initialize product unit dictionary with Chinese common units
-- Date: 2025-12-14
-- Description: 初始化产品单位字典，包含计数单位和常用中国计量单位（重量、长度、体积、面积）

-- 插入字典类型：产品单位
INSERT INTO `dict_types` (`tenant_id`, `code`, `name`, `description`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', '产品单位', '产品计量单位字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_types` WHERE `code` = 'product_unit' AND `tenant_id` IS NULL
);

-- 插入计数单位（sort_order: 1-20）
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', value, label, NULL, sort_order, 'active', NOW(), NOW()
FROM (
  SELECT 'GE' as value, '个' as label, 1 as sort_order
  UNION ALL SELECT 'TAI', '台', 2
  UNION ALL SELECT 'TAO', '套', 3
  UNION ALL SELECT 'JIAN', '件', 4
  UNION ALL SELECT 'XIANG', '箱', 5
  UNION ALL SELECT 'BAO', '包', 6
  UNION ALL SELECT 'PING', '瓶', 7
  UNION ALL SELECT 'GUAN', '罐', 8
  UNION ALL SELECT 'HE', '盒', 9
  UNION ALL SELECT 'DAI', '袋', 10
  UNION ALL SELECT 'TONG', '桶', 11
  UNION ALL SELECT 'KUAI', '块', 12
  UNION ALL SELECT 'PI', '批', 13
  UNION ALL SELECT 'ZU', '组', 14
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);

-- 插入重量单位（sort_order: 21-30）
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', value, label, NULL, sort_order, 'active', NOW(), NOW()
FROM (
  SELECT 'HAOKE' as value, '毫克' as label, 21 as sort_order
  UNION ALL SELECT 'KE', '克', 22
  UNION ALL SELECT 'QIANKE', '千克', 23
  UNION ALL SELECT 'GONGJIN', '公斤', 24
  UNION ALL SELECT 'DUN', '吨', 25
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);

-- 插入长度单位（sort_order: 31-45）
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', value, label, NULL, sort_order, 'active', NOW(), NOW()
FROM (
  SELECT 'HAOMI' as value, '毫米' as label, 31 as sort_order
  UNION ALL SELECT 'LIMI', '厘米', 32
  UNION ALL SELECT 'FENMI', '分米', 33
  UNION ALL SELECT 'MI', '米', 34
  UNION ALL SELECT 'QIANMI', '千米', 35
  UNION ALL SELECT 'GONGLI', '公里', 36
  UNION ALL SELECT 'LI', '里', 37
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);

-- 插入体积单位（sort_order: 46-55）
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', value, label, NULL, sort_order, 'active', NOW(), NOW()
FROM (
  SELECT 'LIFANGHAOMI' as value, '立方毫米' as label, 46 as sort_order
  UNION ALL SELECT 'LIFANGLIMI', '立方厘米', 47
  UNION ALL SELECT 'HAOSHENG', '毫升', 48
  UNION ALL SELECT 'SHENG', '升', 49
  UNION ALL SELECT 'LIFANGMI', '立方米', 50
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);

-- 插入面积单位（sort_order: 56-70）
INSERT INTO `dict_items` (`tenant_id`, `type_code`, `value`, `label`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', value, label, NULL, sort_order, 'active', NOW(), NOW()
FROM (
  SELECT 'PINGFANGHAOMI' as value, '平方毫米' as label, 56 as sort_order
  UNION ALL SELECT 'PINGFANGLIMI', '平方厘米', 57
  UNION ALL SELECT 'PINGFANGFENMI', '平方分米', 58
  UNION ALL SELECT 'PINGFANGMI', '平方米', 59
  UNION ALL SELECT 'MU', '亩', 60
  UNION ALL SELECT 'GONGQING', '公顷', 61
  UNION ALL SELECT 'PINGFANGQIANMI', '平方千米', 62
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);
