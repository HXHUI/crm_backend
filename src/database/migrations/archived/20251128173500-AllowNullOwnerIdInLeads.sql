-- Migration: AllowNullOwnerIdInLeads
-- Version: 20251128173500
-- Description: 允许 leads 表的 owner_id 字段为 NULL（用于线索池功能）

-- 删除外键约束（如果存在）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'leads' 
    AND constraint_name = 'fk_leads_owner'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE leads DROP FOREIGN KEY fk_leads_owner',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改 owner_id 列，允许为 NULL
ALTER TABLE leads MODIFY COLUMN owner_id BIGINT NULL COMMENT '负责人ID（NULL表示线索池）';

-- 重新添加外键约束，使用 ON DELETE SET NULL
SET @sql2 = IF(@fk_exists > 0,
  'ALTER TABLE leads ADD CONSTRAINT fk_leads_owner FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

