-- 初始化拜访准备字典
-- 创建时间: 2025-12-15 16:08:00

-- 1. 创建字典类型（如果不存在）
INSERT INTO dict_types (tenant_id, code, name, description, status, created_at, updated_at)
SELECT NULL, 'visit_preparation', '拜访准备', '拜访准备物品字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_types WHERE code = 'visit_preparation' AND tenant_id IS NULL);

-- 2. 初始化字典项
INSERT INTO dict_items (tenant_id, type_code, value, label, parent_id, sort_order, status, created_at, updated_at)
SELECT 
  NULL as tenant_id,
  'visit_preparation' as type_code,
  prep_key as value,
  prep_label as label,
  NULL as parent_id,
  prep_sort as sort_order,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT 'sample' as prep_key, '样品' as prep_label, 0 as prep_sort
  UNION ALL SELECT 'brochure', '宣传册', 1
  UNION ALL SELECT 'notebook', '笔记本', 2
  UNION ALL SELECT 'measuring_tool', '测量工具', 3
  UNION ALL SELECT 'product_solution', '产品方案', 4
  UNION ALL SELECT 'question_list', '问题清单', 5
) AS prep_data
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items 
  WHERE type_code = 'visit_preparation' AND value = prep_data.prep_key AND tenant_id IS NULL
);

