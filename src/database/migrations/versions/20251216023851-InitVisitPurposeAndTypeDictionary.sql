-- 初始化拜访目的和拜访类型字典
-- 创建时间: 2025-12-16 02:38:51

-- 1. 创建拜访目的字典类型（如果不存在）
INSERT INTO dict_types (tenant_id, code, name, description, status, created_at, updated_at)
SELECT NULL, 'visit_purpose', '拜访目的', '拜访目的字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_types WHERE code = 'visit_purpose' AND tenant_id IS NULL);

-- 2. 初始化拜访目的字典项
INSERT INTO dict_items (tenant_id, type_code, value, label, parent_id, sort_order, status, created_at, updated_at)
SELECT 
  NULL as tenant_id,
  'visit_purpose' as type_code,
  purpose_key as value,
  purpose_label as label,
  NULL as parent_id,
  purpose_sort as sort_order,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT 'understand_needs' as purpose_key, '了解需求' as purpose_label, 0 as purpose_sort
  UNION ALL SELECT 'monthly_performance', '月度履约', 1
  UNION ALL SELECT 'performance_increment', '业绩增量', 2
  UNION ALL SELECT 'product_promotion', '产品推广', 3
  UNION ALL SELECT 'holiday_visit', '节日走访', 4
  UNION ALL SELECT 'contract_signing', '合同签订', 5
  UNION ALL SELECT 'sign_statement', '签对账单', 6
  UNION ALL SELECT 'price_policy', '价格政策', 7
  UNION ALL SELECT 'after_sales_service', '售后服务', 8
  UNION ALL SELECT 'negotiate_cooperation', '协商合作细节', 9
  UNION ALL SELECT 'understand_business', '了解客户经营状况', 10
  UNION ALL SELECT 'sample_tracking', '样品跟踪测试', 11
) AS purpose_data
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items 
  WHERE type_code = 'visit_purpose' AND value = purpose_data.purpose_key AND tenant_id IS NULL
);

-- 3. 创建拜访类型字典类型（如果不存在）
INSERT INTO dict_types (tenant_id, code, name, description, status, created_at, updated_at)
SELECT NULL, 'visit_type', '拜访类型', '拜访类型字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_types WHERE code = 'visit_type' AND tenant_id IS NULL);

-- 4. 初始化拜访类型字典项
INSERT INTO dict_items (tenant_id, type_code, value, label, parent_id, sort_order, status, created_at, updated_at)
SELECT 
  NULL as tenant_id,
  'visit_type' as type_code,
  type_key as value,
  type_label as label,
  NULL as parent_id,
  type_sort as sort_order,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT 'first_visit' as type_key, '首次拜访' as type_label, 0 as type_sort
  UNION ALL SELECT 'follow_up', '跟进拜访', 1
  UNION ALL SELECT 'maintenance', '维护拜访', 2
  UNION ALL SELECT 'business_negotiation', '商务洽谈', 3
  UNION ALL SELECT 'technical_support', '技术支持', 4
  UNION ALL SELECT 'training', '培训', 5
  UNION ALL SELECT 'other', '其他', 6
) AS type_data
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items 
  WHERE type_code = 'visit_type' AND value = type_data.type_key AND tenant_id IS NULL
);
