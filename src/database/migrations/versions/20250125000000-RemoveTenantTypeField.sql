-- Migration: RemoveTenantTypeField
-- Version: 20250125000000
-- Description: 删除租户表中的type字段和索引，简化租户管理，仅保留上下级关系

-- 检查并删除type索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
  AND table_name = 'tenants'
  AND index_name = 'idx_tenants_type');
SET @sql = IF(@idx_exists > 0,
  'DROP INDEX idx_tenants_type ON tenants',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并删除type字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'tenants'
  AND column_name = 'type');

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE tenants DROP COLUMN type',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要回滚，需要重新创建字段和索引）
-- ALTER TABLE tenants ADD COLUMN type ENUM('group', 'subsidiary', 'standard') NOT NULL DEFAULT 'standard' COMMENT '租户类型' AFTER parent_id;
-- CREATE INDEX idx_tenants_type ON tenants (type);

