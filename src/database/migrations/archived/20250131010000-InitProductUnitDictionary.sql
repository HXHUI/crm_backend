-- 初始化产品单位字典（系统级别）
-- Migration: Initialize product unit dictionary
-- Date: 2025-01-31

-- 插入字典类型：产品单位
INSERT INTO `dict_types` (`tenant_id`, `code`, `name`, `description`, `status`, `created_at`, `updated_at`)
SELECT NULL, 'product_unit', '产品单位', '产品计量单位字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_types` WHERE `code` = 'product_unit' AND `tenant_id` IS NULL
);

-- 获取字典类型ID
SET @unit_type_id = (SELECT `id` FROM `dict_types` WHERE `code` = 'product_unit' AND `tenant_id` IS NULL LIMIT 1);

-- 插入常用单位字典项
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
  UNION ALL SELECT 'PING', '平', 12
  UNION ALL SELECT 'MI', '米', 13
  UNION ALL SELECT 'GONGJIN', '公斤', 14
  UNION ALL SELECT 'DUN', '吨', 15
  UNION ALL SELECT 'SHENG', '升', 16
  UNION ALL SELECT 'LI', '里', 17
  UNION ALL SELECT 'KUAI', '块', 18
  UNION ALL SELECT 'PI', '批', 19
  UNION ALL SELECT 'ZU', '组', 20
) AS units
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_items` WHERE `type_code` = 'product_unit' AND `value` = units.value AND `tenant_id` IS NULL
);

