-- 20250921170000-remove-role-code-field.sql
-- 移除角色表中的code字段

-- Up Migration
ALTER TABLE `roles` DROP COLUMN `code`;

-- Down Migration
ALTER TABLE `roles` ADD COLUMN `code` VARCHAR(50) NULL COMMENT '角色编码';
