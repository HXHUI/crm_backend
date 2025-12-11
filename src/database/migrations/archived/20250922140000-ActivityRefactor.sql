-- Migration: ActivityRefactor
-- Version: 20250922140000
-- Description: 重构 activities 表，将 customerId 和 opportunityId 替换为通用的关联字段

-- 注意：如果外键或字段不存在，这些语句会失败，但可以通过迁移服务处理错误
-- MySQL 8.0+ 才支持 DROP FOREIGN KEY IF EXISTS，旧版本需要手动处理错误
-- 如果外键或字段不存在，说明迁移可能已执行或表结构不同，可以忽略错误

-- 删除 customerId 和 opportunityId 的外键约束（如果存在）
-- 先查询实际的外键名称
-- 注意：实际的外键名称可能不同，这里尝试常见的命名方式

-- 删除 FK_activities_customer 外键（如果存在）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND constraint_name = 'FK_activities_customer'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE activities DROP FOREIGN KEY FK_activities_customer',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 FK_activities_opportunity 外键（如果存在）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND constraint_name = 'FK_activities_opportunity'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE activities DROP FOREIGN KEY FK_activities_opportunity',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 customerId 和 opportunityId 字段（如果存在）
-- 注意：如果字段不存在会失败，但可以忽略
-- 为了安全，先检查字段是否存在
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND column_name = 'customerId'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE activities DROP COLUMN customerId',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'activities' 
    AND column_name = 'opportunityId'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE activities DROP COLUMN opportunityId',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加新的关联字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'relatedToType');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN relatedToType ENUM(\'customer\', \'contact\', \'opportunity\', \'lead\') NOT NULL COMMENT \'关联主体类型\' AFTER owner_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'relatedToId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN relatedToId VARCHAR(36) NOT NULL COMMENT \'关联主体ID\' AFTER relatedToType', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'assignedBy');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN assignedBy VARCHAR(36) NULL COMMENT \'分配人(成员ID)\' AFTER relatedToId', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'priority');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN priority ENUM(\'low\', \'medium\', \'high\', \'urgent\') NOT NULL DEFAULT \'medium\' COMMENT \'优先级\' AFTER assignedBy', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'activities' AND column_name = 'content');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE activities ADD COLUMN content TEXT NULL COMMENT \'活动详细内容/完成笔记\' AFTER priority', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 创建复合索引用于查询（如果不存在）
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'activities' AND index_name = 'idx_activities_related_to');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_activities_related_to ON activities(relatedToType, relatedToId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 回滚语句
-- DROP INDEX idx_activities_related_to ON activities;
-- ALTER TABLE activities DROP COLUMN content;
-- ALTER TABLE activities DROP COLUMN priority;
-- ALTER TABLE activities DROP COLUMN assignedBy;
-- ALTER TABLE activities DROP COLUMN relatedToId;
-- ALTER TABLE activities DROP COLUMN relatedToType;
-- ALTER TABLE activities ADD COLUMN customerId VARCHAR(36) NOT NULL COMMENT '客户ID';
-- ALTER TABLE activities ADD COLUMN opportunityId VARCHAR(36) NULL COMMENT '商机ID';
-- ALTER TABLE activities ADD CONSTRAINT FK_activities_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE;
-- ALTER TABLE activities ADD CONSTRAINT FK_activities_opportunity FOREIGN KEY (opportunityId) REFERENCES opportunities(id) ON DELETE SET NULL;

