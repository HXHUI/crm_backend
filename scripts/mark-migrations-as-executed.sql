-- 标记所有已整合到 init-db.sql 的迁移为已完成
-- 此脚本用于在重新初始化数据库后，标记所有历史迁移为已执行
-- 执行方式：mysql -u root -p crm_db < scripts/mark-migrations-as-executed.sql

USE crm_db;

-- 插入所有已整合的迁移记录（如果不存在）
INSERT INTO migrations (version, name, executed_at, created_at) VALUES
('20250920195345', 'initial-schema', NOW(), NOW()),
('20250920195353', 'add-user-profile-fields', NOW(), NOW()),
('20250920195413', 'add-customer-tags-fixed', NOW(), NOW()),
('20250920200000', 'update-user-member-schema', NOW(), NOW()),
('20250921151120', 'fix-member-departments-index', NOW(), NOW()),
('20250921160000', 'remove-realname-field', NOW(), NOW()),
('20250921170000', 'remove-role-code-field', NOW(), NOW()),
('20250921180000', 'remove-role-sort-field', NOW(), NOW()),
('20250921190000', 'fix-member-departments-table', NOW(), NOW()),
('20250921195000', 'add-customer-pool-type', NOW(), NOW()),
('20250921195100', 'modify-customer-owner-id', NOW(), NOW()),
('20250921195200', 'add-customer-indexes', NOW(), NOW()),
('20250921210000', 'modify-opportunity-owner-id-nullable', NOW(), NOW()),
('20250922000000', 'AddCustomerTags', NOW(), NOW()),
('20250922010000', 'AddCustomerTagsEntities', NOW(), NOW()),
('20250922103000', 'AddTenantIdToCoreTables', NOW(), NOW()),
('20250922110000', 'CreateLeadsTable', NOW(), NOW()),
('20250922113000', 'ModifyLeadsName', NOW(), NOW()),
('20250922120000', 'RenameLeadsColumnsToCamel', NOW(), NOW()),
('20250922121000', 'LeadCustomerAddress', NOW(), NOW()),
('20250922140000', 'ActivityRefactor', NOW(), NOW()),
('20251005160621', 'UpdateOpportunityStatus', NOW(), NOW()),
('20251006031159', 'UpdateOpportunityStatusEnums', NOW(), NOW()),
('20251006033427', 'FixOpportunityEnums', NOW(), NOW()),
('20251007090000', 'CreateTargetTable', NOW(), NOW())
ON DUPLICATE KEY UPDATE executed_at = executed_at;

SELECT '所有迁移已标记为已完成！' as message;
SELECT COUNT(*) as total_migrations FROM migrations;

