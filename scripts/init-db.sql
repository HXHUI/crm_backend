-- CRM数据库初始化脚本
-- 此脚本包含所有表结构的DDL语句（已整合所有迁移更改）
-- 版本：2025-10-07（整合所有迁移后的最新版本）
-- 注意：在生产环境中，建议使用程序化的数据库初始化工具

-- 创建数据库
CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE crm_db;

-- ========================================
-- 基础表结构（已整合所有迁移更改）
-- ========================================

-- 0. 迁移记录表（系统表）
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE COMMENT '迁移版本号',
  name VARCHAR(255) NOT NULL COMMENT '迁移名称',
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_version (version),
  INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL COMMENT '用户名',
  email VARCHAR(255) NULL COMMENT '邮箱（可选）',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  phone VARCHAR(20) NOT NULL COMMENT '手机号码（必填，唯一）',
  avatar VARCHAR(500) COMMENT '头像URL',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '用户状态',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  last_login_ip VARCHAR(45) COMMENT '最后登录IP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  UNIQUE KEY UQ_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 租户表
CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '租户名称',
  description TEXT COMMENT '租户描述',
  logo VARCHAR(500) COMMENT '租户Logo URL',
  status ENUM('active', 'inactive', 'suspended', 'expired') DEFAULT 'active' COMMENT '租户状态',
  config JSON COMMENT '租户配置',
  owner_id BIGINT NOT NULL COMMENT '租户所有者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 成员表
CREATE TABLE IF NOT EXISTS members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('active', 'inactive', 'pending') DEFAULT 'active' COMMENT '成员状态',
  nickname VARCHAR(255) COMMENT '成员在租户中的昵称',
  position VARCHAR(255) COMMENT '成员在租户中的职位',
  permissions JSON COMMENT '成员权限配置',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_user_id (user_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_tenant (user_id, tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 部门表
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '部门名称',
  code VARCHAR(100) COMMENT '部门编码',
  description TEXT COMMENT '部门描述',
  parent_id BIGINT COMMENT '父部门ID',
  manager_id BIGINT COMMENT '部门负责人ID',
  sort INT DEFAULT 0 COMMENT '排序',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_code (code),
  INDEX idx_parent_id (parent_id),
  INDEX idx_sort (sort),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 角色表
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '角色名称',
  description TEXT COMMENT '角色描述',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_is_active (is_active),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '权限名称',
  code VARCHAR(255) UNIQUE NOT NULL COMMENT '权限编码',
  description TEXT COMMENT '权限描述',
  type ENUM('menu', 'button', 'api') DEFAULT 'api' COMMENT '权限类型',
  parent_id BIGINT COMMENT '父权限ID',
  sort INT DEFAULT 0 COMMENT '排序',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_code (code),
  INDEX idx_type (type),
  INDEX idx_parent_id (parent_id),
  INDEX idx_sort (sort),
  INDEX idx_is_active (is_active),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (parent_id) REFERENCES permissions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 成员-部门关联表
CREATE TABLE IF NOT EXISTS member_departments (
  memberId BIGINT NOT NULL COMMENT '成员ID',
  departmentId BIGINT NOT NULL COMMENT '部门ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  PRIMARY KEY (memberId, departmentId),
  INDEX idx_member_id (memberId),
  INDEX idx_department_id (departmentId),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 成员-角色关联表
CREATE TABLE IF NOT EXISTS member_roles (
  member_id BIGINT NOT NULL COMMENT '成员ID',
  role_id BIGINT NOT NULL COMMENT '角色ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  PRIMARY KEY (member_id, role_id),
  INDEX idx_member_id (member_id),
  INDEX idx_role_id (role_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL COMMENT '角色ID',
  permission_id BIGINT NOT NULL COMMENT '权限ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  PRIMARY KEY (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 客户表
CREATE TABLE IF NOT EXISTS customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '客户名称',
  code VARCHAR(100) COMMENT '客户编码',
  type ENUM('individual', 'company') DEFAULT 'individual' COMMENT '客户类型',
  status ENUM('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'lead' COMMENT '客户状态',
  company_name VARCHAR(255) COMMENT '公司名称',
  industry VARCHAR(255) COMMENT '行业',
  size VARCHAR(100) COMMENT '客户规模',
  description TEXT COMMENT '客户描述',
  tags JSON COMMENT '客户标签',
  estimated_value DECIMAL(10,2) COMMENT '预计价值',
  source VARCHAR(255) COMMENT '客户来源',
  level VARCHAR(100) COMMENT '客户等级',
  pool_type ENUM('public', 'private') NOT NULL DEFAULT 'private' COMMENT '客户池类型',
  province VARCHAR(50) NULL COMMENT '省份',
  city VARCHAR(50) NULL COMMENT '城市',
  district VARCHAR(50) NULL COMMENT '区县',
  address_detail VARCHAR(200) NULL COMMENT '详细地址',
  ownerId BIGINT NULL COMMENT '所属成员ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_code (code),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_customers_pool_type (pool_type),
  INDEX idx_customers_owner_id (ownerId),
  INDEX idx_customers_tenant_id (tenant_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 联系人表
CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '联系人姓名',
  position VARCHAR(255) COMMENT '职位',
  department VARCHAR(255) COMMENT '部门',
  email VARCHAR(255) COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  telephone VARCHAR(20) COMMENT '座机',
  type ENUM('primary', 'secondary', 'decision_maker', 'influencer', 'user') DEFAULT 'secondary' COMMENT '联系人类型',
  is_primary BOOLEAN DEFAULT FALSE COMMENT '是否主要联系人',
  notes TEXT COMMENT '备注',
  other_contacts JSON COMMENT '其他联系方式',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_customer_id (customer_id),
  INDEX idx_contacts_tenant_id (tenant_id),
  INDEX idx_type (type),
  INDEX idx_is_primary (is_primary),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. 商机表
CREATE TABLE IF NOT EXISTS opportunities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '商机名称',
  description TEXT COMMENT '商机描述',
  status ENUM('active', 'waiting_client', 'on_hold', 'at_risk', 'closed') NOT NULL DEFAULT 'active' COMMENT '商机状态',
  stage ENUM('initial_contact', 'needs_analysis', 'proposal_quote', 'negotiation_review', 'closed_won', 'closed_lost') NOT NULL DEFAULT 'initial_contact' COMMENT '商机阶段',
  amount DECIMAL(10,2) NOT NULL COMMENT '预计金额',
  probability DECIMAL(5,2) DEFAULT 0 COMMENT '成功概率(%)',
  expected_close_date TIMESTAMP NULL COMMENT '预计成交时间',
  actual_close_date TIMESTAMP NULL COMMENT '实际成交时间',
  source VARCHAR(255) COMMENT '商机来源',
  competitor VARCHAR(255) COMMENT '竞争对手',
  tags JSON COMMENT '商机标签',
  notes JSON COMMENT '商机备注',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  ownerId BIGINT NULL COMMENT '负责人ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_stage (stage),
  INDEX idx_customer_id (customer_id),
  INDEX idx_owner_id (ownerId),
  INDEX idx_opportunities_tenant_id (tenant_id),
  INDEX idx_expected_close_date (expected_close_date),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. 活动表
CREATE TABLE IF NOT EXISTS activities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '活动标题',
  description TEXT COMMENT '活动描述',
  type ENUM('call', 'email', 'meeting', 'task', 'note', 'demo', 'presentation', 'follow_up') NOT NULL COMMENT '活动类型',
  status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned' COMMENT '活动状态',
  planned_start_time TIMESTAMP NOT NULL COMMENT '计划开始时间',
  planned_end_time TIMESTAMP NOT NULL COMMENT '计划结束时间',
  actual_start_time TIMESTAMP NULL COMMENT '实际开始时间',
  actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',
  location VARCHAR(255) COMMENT '活动地点',
  outcome TEXT COMMENT '活动结果',
  attachments JSON COMMENT '活动附件',
  participants JSON COMMENT '活动参与者',
  owner_id BIGINT NOT NULL COMMENT '负责人ID',
  relatedToType ENUM('customer', 'contact', 'opportunity', 'lead') NOT NULL COMMENT '关联主体类型',
  relatedToId BIGINT NOT NULL COMMENT '关联主体ID',
  assignedBy BIGINT NULL COMMENT '分配人(成员ID)',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  content TEXT NULL COMMENT '活动详细内容/完成笔记',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_title (title),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_owner_id (owner_id),
  INDEX idx_activities_related_to (relatedToType, relatedToId),
  INDEX idx_activities_tenant_id (tenant_id),
  INDEX idx_planned_start_time (planned_start_time),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. 套餐表
CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '套餐名称',
  description TEXT COMMENT '套餐描述',
  type ENUM('free', 'basic', 'professional', 'enterprise') NOT NULL COMMENT '套餐类型',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly' COMMENT '计费周期',
  user_limit INT DEFAULT -1 COMMENT '用户数量限制(-1表示无限制)',
  storage_limit INT DEFAULT -1 COMMENT '存储空间限制(GB, -1表示无限制)',
  features JSON COMMENT '功能特性',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  sort INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_sort (sort),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. 租户订阅表
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('active', 'inactive', 'expired', 'cancelled', 'trial') DEFAULT 'active' COMMENT '订阅状态',
  start_date TIMESTAMP NOT NULL COMMENT '开始时间',
  end_date TIMESTAMP NOT NULL COMMENT '结束时间',
  trial_end_date TIMESTAMP NULL COMMENT '试用结束时间',
  price DECIMAL(10,2) NOT NULL COMMENT '订阅价格',
  auto_renew BOOLEAN DEFAULT TRUE COMMENT '自动续费',
  payment_method VARCHAR(255) COMMENT '支付方式',
  payment_id VARCHAR(255) COMMENT '支付ID',
  config JSON COMMENT '订阅配置',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  plan_id BIGINT NOT NULL COMMENT '套餐ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_status (status),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. 客户标签表
CREATE TABLE IF NOT EXISTS customer_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签名称',
  color VARCHAR(7) DEFAULT '#1890ff' COMMENT '标签颜色',
  description TEXT COMMENT '标签描述',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_name (name),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tenant_tag_name (tenant_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. 客户标签关联表
CREATE TABLE IF NOT EXISTS customer_tag_relations (
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  tag_id BIGINT NOT NULL COMMENT '标签ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (customer_id, tag_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES customer_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. 线索表
CREATE TABLE IF NOT EXISTS leads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  owner_id BIGINT NOT NULL COMMENT '当前负责人ID',
  name VARCHAR(100) NULL COMMENT '姓名',
  company VARCHAR(100) COMMENT '公司名称',
  title VARCHAR(100) COMMENT '职位',
  phone VARCHAR(20) COMMENT '电话',
  email VARCHAR(100) COMMENT '邮箱',
  lead_source VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT '线索来源',
  status ENUM('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new' COMMENT '线索状态',
  rating ENUM('hot','warm','cold') DEFAULT 'warm' COMMENT '评分',
  industry VARCHAR(50) NULL COMMENT '客户行业（字典key）',
  level VARCHAR(20) NULL COMMENT '客户等级',
  province VARCHAR(50) NULL COMMENT '省份',
  city VARCHAR(50) NULL COMMENT '城市',
  district VARCHAR(50) NULL COMMENT '区县',
  address_detail VARCHAR(200) NULL COMMENT '详细地址',
  lastContactedAt DATETIME NULL COMMENT '最后联系时间',
  convertedAt DATETIME NULL COMMENT '转化时间',
  converted_customer_id BIGINT NULL COMMENT '转化的客户ID',
  converted_contact_id BIGINT NULL COMMENT '转化的联系人ID',
  converted_opportunity_id BIGINT NULL COMMENT '转化的商机ID',
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP NULL,
  INDEX idx_leads_tenant_id (tenant_id),
  INDEX idx_leads_owner_id (owner_id),
  INDEX idx_leads_status (status),
  INDEX idx_leads_rating (rating),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. 目标表
CREATE TABLE IF NOT EXISTS target (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_value DECIMAL(20,2) NOT NULL,
  current_value DECIMAL(20,2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT '元',
  target_month DATE NOT NULL,
  owner_type ENUM('tenant','department','member') NOT NULL,
  owner_id BIGINT NOT NULL,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  status ENUM('active','completed') DEFAULT 'active',
  created_by BIGINT NOT NULL,
  updated_by BIGINT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  CONSTRAINT fk_target_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_target_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_target (tenant_id, owner_type, owner_id, target_type, target_month),
  INDEX idx_tenant_month (tenant_id, target_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='目标表(按月存储)';

-- ========================================
-- 基础数据插入
-- ========================================

-- 插入基础权限数据
-- 插入基础权限数据（使用子查询获取父权限ID）
INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) VALUES
('用户管理', 'user:manage', '用户管理权限', 'menu', NULL, 1, TRUE, NOW(), NOW()),
('客户管理', 'customer:manage', '客户管理权限', 'menu', NULL, 2, TRUE, NOW(), NOW()),
('商机管理', 'opportunity:manage', '商机管理权限', 'menu', NULL, 3, TRUE, NOW(), NOW()),
('活动管理', 'activity:manage', '活动管理权限', 'menu', NULL, 4, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入子权限（使用子查询获取父权限ID）
INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '查看客户', 'customer:view', '查看客户权限', 'api', id, 1, TRUE, NOW(), NOW() FROM permissions WHERE code = 'customer:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '创建客户', 'customer:create', '创建客户权限', 'api', id, 2, TRUE, NOW(), NOW() FROM permissions WHERE code = 'customer:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '编辑客户', 'customer:edit', '编辑客户权限', 'api', id, 3, TRUE, NOW(), NOW() FROM permissions WHERE code = 'customer:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '删除客户', 'customer:delete', '删除客户权限', 'api', id, 4, TRUE, NOW(), NOW() FROM permissions WHERE code = 'customer:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '查看商机', 'opportunity:view', '查看商机权限', 'api', id, 1, TRUE, NOW(), NOW() FROM permissions WHERE code = 'opportunity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '创建商机', 'opportunity:create', '创建商机权限', 'api', id, 2, TRUE, NOW(), NOW() FROM permissions WHERE code = 'opportunity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '编辑商机', 'opportunity:edit', '编辑商机权限', 'api', id, 3, TRUE, NOW(), NOW() FROM permissions WHERE code = 'opportunity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '删除商机', 'opportunity:delete', '删除商机权限', 'api', id, 4, TRUE, NOW(), NOW() FROM permissions WHERE code = 'opportunity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '查看活动', 'activity:view', '查看活动权限', 'api', id, 1, TRUE, NOW(), NOW() FROM permissions WHERE code = 'activity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '创建活动', 'activity:create', '创建活动权限', 'api', id, 2, TRUE, NOW(), NOW() FROM permissions WHERE code = 'activity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '编辑活动', 'activity:edit', '编辑活动权限', 'api', id, 3, TRUE, NOW(), NOW() FROM permissions WHERE code = 'activity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO permissions (name, code, description, type, parent_id, sort, is_active, created_at, updated_at) 
SELECT '删除活动', 'activity:delete', '删除活动权限', 'api', id, 4, TRUE, NOW(), NOW() FROM permissions WHERE code = 'activity:manage'
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入基础套餐数据
INSERT INTO subscription_plans (name, description, type, price, billing_cycle, user_limit, storage_limit, features, is_active, sort, created_at, updated_at) VALUES
('免费版', '免费版套餐，适合个人用户', 'free', 0.00, 'monthly', 1, 1, '["基础客户管理", "基础商机管理", "基础活动管理"]', TRUE, 1, NOW(), NOW()),
('基础版', '基础版套餐，适合小团队', 'basic', 99.00, 'monthly', 5, 10, '["完整客户管理", "完整商机管理", "完整活动管理", "基础报表"]', TRUE, 2, NOW(), NOW()),
('专业版', '专业版套餐，适合中型企业', 'professional', 299.00, 'monthly', 20, 50, '["完整客户管理", "完整商机管理", "完整活动管理", "高级报表", "自定义字段", "API访问"]', TRUE, 3, NOW(), NOW()),
('企业版', '企业版套餐，适合大型企业', 'enterprise', 999.00, 'monthly', -1, -1, '["完整功能", "无限用户", "无限存储", "高级安全", "专属支持", "自定义集成"]', TRUE, 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 输出初始化完成信息
SELECT 'CRM数据库初始化完成！' as message;
SELECT '包含20个数据表：' as info;
SELECT '0. migrations (迁移记录表)' as table_info UNION ALL
SELECT '1. users (用户表)' as table_info UNION ALL
SELECT '2. tenants (租户表)' as table_info UNION ALL
SELECT '3. members (成员表)' as table_info UNION ALL
SELECT '4. departments (部门表)' as table_info UNION ALL
SELECT '5. roles (角色表)' as table_info UNION ALL
SELECT '6. permissions (权限表)' as table_info UNION ALL
SELECT '7. member_departments (成员-部门关联表)' as table_info UNION ALL
SELECT '8. member_roles (成员-角色关联表)' as table_info UNION ALL
SELECT '9. role_permissions (角色-权限关联表)' as table_info UNION ALL
SELECT '10. customers (客户表)' as table_info UNION ALL
SELECT '11. contacts (联系人表)' as table_info UNION ALL
SELECT '12. opportunities (商机表)' as table_info UNION ALL
SELECT '13. activities (活动表)' as table_info UNION ALL
SELECT '14. subscription_plans (套餐表)' as table_info UNION ALL
SELECT '15. tenant_subscriptions (租户订阅表)' as table_info UNION ALL
SELECT '16. customer_tags (客户标签表)' as table_info UNION ALL
SELECT '17. customer_tag_relations (客户标签关联表)' as table_info UNION ALL
SELECT '18. leads (线索表)' as table_info UNION ALL
SELECT '19. target (目标表)' as table_info;
