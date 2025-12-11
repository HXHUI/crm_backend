-- Migration: CreateContractsTables
-- Version: 20251116153820
-- Description: 创建合同、合同明细、合同模板、合同审批表，并修改订单表添加合同ID字段

-- 创建合同表
CREATE TABLE IF NOT EXISTS contracts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_number VARCHAR(100) NOT NULL COMMENT '合同编号',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  contact_id BIGINT NULL COMMENT '联系人ID',
  quote_id BIGINT NULL COMMENT '报价ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  type ENUM('sales','service','maintenance','other') NOT NULL DEFAULT 'sales' COMMENT '合同类型',
  status ENUM('draft','pending_sign','signed','active','expired','terminated') NOT NULL DEFAULT 'draft' COMMENT '合同状态',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '合同金额',
  sign_date DATE NULL COMMENT '签署日期',
  effective_date DATE NULL COMMENT '生效日期',
  expiry_date DATE NULL COMMENT '到期日期',
  content TEXT NULL COMMENT '合同内容/条款',
  attachments JSON NULL COMMENT '附件列表（JSON数组）',
  template_id BIGINT NULL COMMENT '合同模板ID',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_contracts_tenant_id (tenant_id),
  INDEX idx_contracts_customer_id (customer_id),
  INDEX idx_contracts_contact_id (contact_id),
  INDEX idx_contracts_quote_id (quote_id),
  INDEX idx_contracts_opportunity_id (opportunity_id),
  INDEX idx_contracts_contract_number (contract_number),
  INDEX idx_contracts_type (type),
  INDEX idx_contracts_status (status),
  INDEX idx_contracts_ownerId (ownerId),
  CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contracts_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同表';

-- 创建合同明细表
CREATE TABLE IF NOT EXISTS contract_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL COMMENT '合同ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  amount DECIMAL(10,2) NOT NULL COMMENT '金额',
  discount DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '折扣(%)',
  notes TEXT NULL COMMENT '备注',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_contract_items_tenant_id (tenant_id),
  INDEX idx_contract_items_contract_id (contract_id),
  INDEX idx_contract_items_product_id (product_id),
  CONSTRAINT fk_contract_items_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同明细表';

-- 创建合同模板表
CREATE TABLE IF NOT EXISTS contract_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '模板名称',
  type ENUM('sales','service','maintenance','other') NOT NULL DEFAULT 'sales' COMMENT '模板类型',
  content TEXT NULL COMMENT '模板内容',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  notes TEXT NULL COMMENT '备注',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_contract_templates_tenant_id (tenant_id),
  INDEX idx_contract_templates_type (type),
  INDEX idx_contract_templates_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同模板表';

-- 创建合同审批表
CREATE TABLE IF NOT EXISTS contract_approvals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL COMMENT '合同ID',
  approver_id BIGINT NOT NULL COMMENT '审批人ID',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审批状态',
  approval_comment TEXT NULL COMMENT '审批意见',
  approval_time TIMESTAMP NULL COMMENT '审批时间',
  approval_order INT NOT NULL DEFAULT 1 COMMENT '审批顺序',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_contract_approvals_tenant_id (tenant_id),
  INDEX idx_contract_approvals_contract_id (contract_id),
  INDEX idx_contract_approvals_approver_id (approver_id),
  INDEX idx_contract_approvals_status (status),
  CONSTRAINT fk_contract_approvals_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_approvals_approver FOREIGN KEY (approver_id) REFERENCES members(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同审批表';

-- 修改订单表，添加合同ID字段
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND column_name = 'contract_id');
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE orders ADD COLUMN contract_id BIGINT NULL COMMENT ''合同ID'' AFTER quote_id', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加订单表的合同ID索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND index_name = 'idx_orders_contract_id');
SET @sql = IF(@idx_exists = 0, 
  'CREATE INDEX idx_orders_contract_id ON orders (contract_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加订单表的合同外键约束
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND constraint_name = 'fk_orders_contract' 
  AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- ALTER TABLE orders DROP FOREIGN KEY fk_orders_contract;
-- DROP INDEX idx_orders_contract_id ON orders;
-- ALTER TABLE orders DROP COLUMN contract_id;
-- DROP TABLE IF EXISTS contract_approvals;
-- DROP TABLE IF EXISTS contract_templates;
-- DROP TABLE IF EXISTS contract_items;
-- DROP TABLE IF EXISTS contracts;

