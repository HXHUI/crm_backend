-- 迁移来源和行业数据到字典表
-- 创建时间: 2025-12-14 23:00:00

-- 1. 创建字典类型（如果不存在）
INSERT INTO dict_types (tenant_id, code, name, description, status, created_at, updated_at)
SELECT NULL, 'lead_source', '线索/客户来源', '线索和客户的来源字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_types WHERE code = 'lead_source' AND tenant_id IS NULL);

INSERT INTO dict_types (tenant_id, code, name, description, status, created_at, updated_at)
SELECT NULL, 'industry', '行业', '行业分类字典', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_types WHERE code = 'industry' AND tenant_id IS NULL);

-- 2. 迁移来源数据到字典表
INSERT INTO dict_items (tenant_id, type_code, value, label, parent_id, sort_order, status, created_at, updated_at)
SELECT 
  NULL as tenant_id,
  'lead_source' as type_code,
  source_key as value,
  source_label as label,
  NULL as parent_id,
  source_sort as sort_order,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT 'promotion' as source_key, '促销' as source_label, 0 as source_sort
  UNION ALL SELECT 'search', '搜索引擎', 1
  UNION ALL SELECT 'ads', '广告', 2
  UNION ALL SELECT 'referral', '转介绍', 3
  UNION ALL SELECT 'online_signup', '线上注册', 4
  UNION ALL SELECT 'online_quote', '线上询价', 5
  UNION ALL SELECT 'appointment', '预约上门', 6
  UNION ALL SELECT 'event', '展会/活动', 7
  UNION ALL SELECT 'website', '官网/自然到访', 8
  UNION ALL SELECT 'social', '社媒/内容营销', 9
  UNION ALL SELECT 'offline_store', '线下到店', 10
  UNION ALL SELECT 'channel', '渠道合作/代理', 11
  UNION ALL SELECT 'repeat', '复购/老客户', 12
  UNION ALL SELECT 'phone', '外呼（电话咨询）', 13
  UNION ALL SELECT 'email', '邮件咨询', 14
  UNION ALL SELECT 'other', '其他', 15
) AS source_data
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items 
  WHERE type_code = 'lead_source' AND value = source_data.source_key AND tenant_id IS NULL
);

-- 3. 迁移行业数据到字典表
INSERT INTO dict_items (tenant_id, type_code, value, label, parent_id, sort_order, status, created_at, updated_at)
SELECT 
  NULL as tenant_id,
  'industry' as type_code,
  industry_key as value,
  industry_label as label,
  NULL as parent_id,
  industry_sort as sort_order,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT 'it' as industry_key, '计算机/互联网/通信/电子' as industry_label, 0 as industry_sort
  UNION ALL SELECT 'finance', '会计/金融/银行/保险', 1
  UNION ALL SELECT 'manufacturing', '贸易/消费/制造/营运', 2
  UNION ALL SELECT 'pharma', '制药/医疗/健康', 3
  UNION ALL SELECT 'media', '广告/媒体/公关', 4
  UNION ALL SELECT 'real_estate', '房地产/建筑/工程', 5
  UNION ALL SELECT 'education', '专业服务/教育/培训', 6
  UNION ALL SELECT 'services', '生活服务/餐饮/旅游', 7
  UNION ALL SELECT 'logistics', '物流/运输/仓储', 8
  UNION ALL SELECT 'energy', '能源/化工/环保', 9
  UNION ALL SELECT 'automotive', '汽车/机械/设备', 10
  UNION ALL SELECT 'agriculture', '农林牧渔', 11
  UNION ALL SELECT 'public', '政府/公共事业/非营利', 12
  UNION ALL SELECT 'culture', '文化/体育/娱乐', 13
  UNION ALL SELECT 'other', '其他', 14
) AS industry_data
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items 
  WHERE type_code = 'industry' AND value = industry_data.industry_key AND tenant_id IS NULL
);

