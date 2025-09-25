-- 20250921180000-remove-role-sort-field.sql
-- 移除角色表中的sort字段

-- Up Migration
ALTER TABLE `roles` DROP COLUMN `sort`;

-- Down Migration
ALTER TABLE `roles` ADD COLUMN `sort` INT DEFAULT 0 COMMENT '排序';
