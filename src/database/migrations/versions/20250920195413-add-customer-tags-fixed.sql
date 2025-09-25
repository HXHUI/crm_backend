-- Migration: add-customer-tags
-- Version: 20250920195413
-- Created: 2025-09-20T19:54:13.000Z
-- Description: 为客户表添加标签功能

-- 添加客户标签表
CREATE TABLE IF NOT EXISTS customer_tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签名称',
  color VARCHAR(7) DEFAULT '#1890ff' COMMENT '标签颜色',
  description TEXT COMMENT '标签描述',
  tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_name (name),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tenant_tag_name (tenant_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建客户标签关联表
CREATE TABLE IF NOT EXISTS customer_tag_relations (
  customer_id VARCHAR(36) NOT NULL COMMENT '客户ID',
  tag_id VARCHAR(36) NOT NULL COMMENT '标签ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (customer_id, tag_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES customer_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认标签数据
INSERT INTO customer_tags (id, name, color, description, tenant_id, created_at, updated_at) VALUES
(UUID(), '重要客户', '#f5222d', '重要客户标签', (SELECT id FROM tenants LIMIT 1), NOW(), NOW()),
(UUID(), '潜在客户', '#fa8c16', '潜在客户标签', (SELECT id FROM tenants LIMIT 1), NOW(), NOW()),
(UUID(), 'VIP客户', '#722ed1', 'VIP客户标签', (SELECT id FROM tenants LIMIT 1), NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 回滚语句
-- DROP TABLE IF EXISTS customer_tag_relations;
-- DROP TABLE IF EXISTS customer_tags;
