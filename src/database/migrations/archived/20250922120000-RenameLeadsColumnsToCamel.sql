-- Migration: RenameLeadsColumnsToCamel
-- Version: 20250922120000
-- Description: 将 leads 表的字段名从下划线命名改为驼峰命名

-- 注意：如果字段已存在目标名称，则跳过重命名
-- MySQL 不支持直接的条件重命名，需要手动检查或使用存储过程
-- 这里使用简单的重命名，如果字段不存在会失败，但可以通过迁移服务处理

-- 重命名 created_at 为 createdAt
ALTER TABLE leads CHANGE created_at createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

-- 重命名 updated_at 为 updatedAt
ALTER TABLE leads CHANGE updated_at updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- 重命名 deleted_at 为 deletedAt
ALTER TABLE leads CHANGE deleted_at deletedAt TIMESTAMP NULL COMMENT '删除时间';

-- 重命名 last_contacted_at 为 lastContactedAt
ALTER TABLE leads CHANGE last_contacted_at lastContactedAt DATETIME NULL COMMENT '最后联系时间';

-- 重命名 converted_at 为 convertedAt
ALTER TABLE leads CHANGE converted_at convertedAt DATETIME NULL COMMENT '转化时间';

-- 回滚语句
-- ALTER TABLE leads CHANGE createdAt created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
-- ALTER TABLE leads CHANGE updatedAt updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';
-- ALTER TABLE leads CHANGE deletedAt deleted_at TIMESTAMP NULL COMMENT '删除时间';
-- ALTER TABLE leads CHANGE lastContactedAt last_contacted_at DATETIME NULL COMMENT '最后联系时间';
-- ALTER TABLE leads CHANGE convertedAt converted_at DATETIME NULL COMMENT '转化时间';

