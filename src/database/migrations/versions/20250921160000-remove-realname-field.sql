-- 20250921160000-remove-realname-field.sql
-- 移除用户表中的realName字段

-- Up Migration
ALTER TABLE `users` DROP COLUMN `realName`;

-- Down Migration
ALTER TABLE `users` ADD COLUMN `realName` VARCHAR(255) NULL COMMENT '真实姓名';
