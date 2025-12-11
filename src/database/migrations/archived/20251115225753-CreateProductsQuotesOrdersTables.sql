-- Migration: CreateProductsQuotesOrdersTables
-- Version: 20251115225753
-- Description: 创建产品、报价、报价明细、订单、订单明细表

-- 创建产品表
CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '产品名称',
  code VARCHAR(100) NULL COMMENT '产品编码',
  category VARCHAR(100) NULL COMMENT '产品分类',
  specification VARCHAR(255) NULL COMMENT '产品规格',
  unit VARCHAR(50) NULL COMMENT '单位',
  price DECIMAL(10,2) NULL COMMENT '价格',
  cost_price DECIMAL(10,2) NULL COMMENT '成本价',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT '产品状态',
  main_image VARCHAR(500) NULL COMMENT '主图',
  detail_images JSON NULL COMMENT '详情图（最多9张）',
  description TEXT NULL COMMENT '产品描述',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_products_tenant_id (tenant_id),
  INDEX idx_products_code (code),
  INDEX idx_products_category (category),
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 创建报价表
CREATE TABLE IF NOT EXISTS quotes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_number VARCHAR(100) NOT NULL COMMENT '报价单号',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  quote_date DATE NOT NULL COMMENT '报价日期',
  expiry_date DATE NULL COMMENT '有效期',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总金额',
  status ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft' COMMENT '报价状态',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_quotes_tenant_id (tenant_id),
  INDEX idx_quotes_customer_id (customer_id),
  INDEX idx_quotes_opportunity_id (opportunity_id),
  INDEX idx_quotes_quote_number (quote_number),
  INDEX idx_quotes_status (status),
  INDEX idx_quotes_ownerId (ownerId),
  CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_quotes_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报价表';

-- 创建报价明细表
CREATE TABLE IF NOT EXISTS quote_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id BIGINT NOT NULL COMMENT '报价ID',
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
  INDEX idx_quote_items_quote_id (quote_id),
  INDEX idx_quote_items_product_id (product_id),
  INDEX idx_quote_items_tenant_id (tenant_id),
  CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  CONSTRAINT fk_quote_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报价明细表';

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL COMMENT '订单编号',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  quote_id BIGINT NULL COMMENT '报价ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  order_date DATE NOT NULL COMMENT '下单日期',
  delivery_date DATE NULL COMMENT '交付日期',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
  status ENUM('pending','confirmed','processing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_orders_tenant_id (tenant_id),
  INDEX idx_orders_customer_id (customer_id),
  INDEX idx_orders_quote_id (quote_id),
  INDEX idx_orders_opportunity_id (opportunity_id),
  INDEX idx_orders_order_number (order_number),
  INDEX idx_orders_status (status),
  INDEX idx_orders_ownerId (ownerId),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 创建订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL COMMENT '订单ID',
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
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_product_id (product_id),
  INDEX idx_order_items_tenant_id (tenant_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 回滚语句
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS quote_items;
-- DROP TABLE IF EXISTS quotes;
-- DROP TABLE IF EXISTS products;

