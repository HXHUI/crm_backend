-- Migration: CreateCustomerRequirementsTable
-- Version: 20251118013136
-- Description: 创建客户需求管理表，支持显性需求、隐性需求、无形需求的分类管理

-- 检查表是否存在
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'customer_requirements');

SET @sql = IF(@table_exists = 0, 
  CONCAT('CREATE TABLE customer_requirements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT ''需求ID'',
    customer_id BIGINT NOT NULL COMMENT ''客户ID'',
    type ENUM(''explicit'', ''implicit'', ''intangible'') NOT NULL COMMENT ''需求类型：显性需求（客户提出的需求）、隐性需求（客户可能会有的需求）、无形需求（需要自己主动发现）'',
    content VARCHAR(500) NOT NULL COMMENT ''需求内容'',
    problem_to_solve TEXT NULL COMMENT ''需求背后要解决的问题'',
    tags JSON NULL COMMENT ''需求标签（如：价格、质量、技术支持等）'',
    priority INT NOT NULL DEFAULT 0 COMMENT ''优先级：0-低，1-中，2-高'',
    status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''状态：pending-待处理，processing-处理中，resolved-已解决，closed-已关闭'',
    resolved_at TIMESTAMP NULL COMMENT ''解决时间'',
    resolved_by BIGINT NULL COMMENT ''解决人ID'',
    notes TEXT NULL COMMENT ''备注'',
    tenant_id BIGINT NULL COMMENT ''租户ID'',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'',
    deleted_at TIMESTAMP NULL COMMENT ''删除时间'',
    INDEX idx_customer_requirements_customer_id (customer_id),
    INDEX idx_customer_requirements_type (type),
    INDEX idx_customer_requirements_status (status),
    INDEX idx_customer_requirements_priority (priority),
    INDEX idx_customer_requirements_tenant_id (tenant_id),
    INDEX idx_customer_requirements_deleted_at (deleted_at),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''客户需求表'';'),
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- DROP TABLE IF EXISTS customer_requirements;

