-- CRM数据库初始化脚本
-- 此脚本包含所有表结构的DDL语句（已整合所有迁移更改）
-- 版本：2025-12-11（整合所有迁移后的最新版本）
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
  created_by BIGINT NULL COMMENT '创建者ID（用户ID，系统管理员创建）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  UNIQUE KEY UQ_users_phone (phone),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 租户表
CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '租户名称',
  description TEXT COMMENT '租户描述',
  logo VARCHAR(500) COMMENT '租户Logo URL',
  status ENUM('active', 'inactive', 'suspended', 'expired') DEFAULT 'active' COMMENT '租户状态',
  config JSON COMMENT '租户配置',
  default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '默认税率(%)',
  parent_id BIGINT NULL COMMENT '父租户ID（集团层级关系）',
  type ENUM('group', 'subsidiary', 'standard') NOT NULL DEFAULT 'standard' COMMENT '租户类型：group=集团, subsidiary=子公司, standard=普通租户',
  level INT NOT NULL DEFAULT 0 COMMENT '层级深度（0为顶级）',
  owner_id BIGINT NOT NULL COMMENT '租户所有者ID',
  created_by BIGINT NULL COMMENT '创建者ID（用户ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_parent_id (parent_id),
  INDEX idx_type (type),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tenants(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
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
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 角色表
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '角色名称',
  description TEXT COMMENT '角色描述',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  tenant_id BIGINT NOT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_is_active (is_active),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
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
  province VARCHAR(50) NULL COMMENT '省份',
  city VARCHAR(50) NULL COMMENT '城市',
  district VARCHAR(50) NULL COMMENT '区县',
  address_detail VARCHAR(200) NULL COMMENT '详细地址',
  ownerId BIGINT NULL COMMENT '所属成员ID',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_code (code),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_customers_owner_id (ownerId),
  INDEX idx_customers_department_id (department_id),
  INDEX idx_customers_tenant_id (tenant_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
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
  parent_id BIGINT NULL COMMENT '上级联系人ID',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_customer_id (customer_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_department_id (department_id),
  INDEX idx_contacts_tenant_id (tenant_id),
  INDEX idx_type (type),
  INDEX idx_is_primary (is_primary),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
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
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_stage (stage),
  INDEX idx_customer_id (customer_id),
  INDEX idx_owner_id (ownerId),
  INDEX idx_department_id (department_id),
  INDEX idx_opportunities_tenant_id (tenant_id),
  INDEX idx_expected_close_date (expected_close_date),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. 活动表
CREATE TABLE IF NOT EXISTS activities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '活动标题',
  description TEXT COMMENT '活动描述',
  type ENUM('call', 'email', 'meeting', 'task', 'note', 'demo', 'presentation', 'follow_up') NOT NULL COMMENT '活动类型',
  status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned' COMMENT '活动状态',
  planned_start_time TIMESTAMP NULL COMMENT '计划开始时间',
  planned_end_time TIMESTAMP NULL COMMENT '计划结束时间',
  actual_start_time TIMESTAMP NULL COMMENT '实际开始时间',
  actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',
  location VARCHAR(255) COMMENT '活动地点',
  outcome TEXT COMMENT '活动结果',
  attachments JSON COMMENT '活动附件',
  participants JSON COMMENT '活动参与者',
  owner_id BIGINT NOT NULL COMMENT '负责人ID',
  department_id BIGINT NULL COMMENT '部门ID',
  relatedToType ENUM('customer', 'contact', 'opportunity', 'lead') NOT NULL COMMENT '关联主体类型',
  relatedToId BIGINT NOT NULL COMMENT '关联主体ID',
  assignedBy BIGINT NULL COMMENT '分配人(成员ID)',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  content TEXT NULL COMMENT '活动详细内容/完成笔记',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_title (title),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_owner_id (owner_id),
  INDEX idx_department_id (department_id),
  INDEX idx_activities_related_to (relatedToType, relatedToId),
  INDEX idx_activities_tenant_id (tenant_id),
  INDEX idx_planned_start_time (planned_start_time),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
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
  owner_id BIGINT NULL COMMENT '当前负责人ID',
  department_id BIGINT NULL COMMENT '部门ID',
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
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP NULL,
  INDEX idx_leads_tenant_id (tenant_id),
  INDEX idx_leads_owner_id (owner_id),
  INDEX idx_leads_department_id (department_id),
  INDEX idx_leads_status (status),
  INDEX idx_leads_rating (rating),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
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

-- 20. 产品表
CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '产品名称',
  code VARCHAR(100) NULL COMMENT '产品编码',
  category VARCHAR(100) NULL COMMENT '产品分类',
  category_fields JSON NULL COMMENT '动态分类字段（JSON格式，存储配置的分类字段值）',
  specification VARCHAR(255) NULL COMMENT '产品规格',
  unit VARCHAR(50) NULL COMMENT '单位',
  auxiliary_units JSON NULL COMMENT '辅助计量单位配置（JSON数组，格式：[{unit, conversionRate, purpose, description}]）',
  price DECIMAL(10,2) NULL COMMENT '价格',
  cost_price DECIMAL(10,2) NULL COMMENT '成本价',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT '产品状态',
  main_image VARCHAR(500) NULL COMMENT '主图',
  detail_images JSON NULL COMMENT '详情图（最多9张）',
  description TEXT NULL COMMENT '产品描述',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_products_tenant_id (tenant_id),
  INDEX idx_products_code (code),
  INDEX idx_products_category (category),
  INDEX idx_products_status (status),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 21. 报价表
CREATE TABLE IF NOT EXISTS quotes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_number VARCHAR(100) NOT NULL COMMENT '报价单号',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  contact_id BIGINT NULL COMMENT '联系人ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  quote_date DATE NOT NULL COMMENT '报价日期',
  expiry_date DATE NULL COMMENT '有效期',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总金额',
  total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税总金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金合计',
  status ENUM('draft','pending_approval','approved','active','rejected','sent','accepted','expired') NOT NULL DEFAULT 'draft' COMMENT '报价状态',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_quotes_tenant_id (tenant_id),
  INDEX idx_quotes_customer_id (customer_id),
  INDEX idx_quotes_contact_id (contact_id),
  INDEX idx_quotes_opportunity_id (opportunity_id),
  INDEX idx_quotes_quote_number (quote_number),
  INDEX idx_quotes_status (status),
  INDEX idx_quotes_ownerId (ownerId),
  INDEX idx_quotes_department_id (department_id),
  CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_quotes_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报价表';

-- 22. 报价明细表
CREATE TABLE IF NOT EXISTS quote_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id BIGINT NOT NULL COMMENT '报价ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
  packaging_unit VARCHAR(50) NULL COMMENT '包装单位（显示用）',
  packaging_spec VARCHAR(200) NULL COMMENT '包装规格说明（显示用，如：1袋=25kg）',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '税率(%)',
  unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税单价',
  amount DECIMAL(10,2) NOT NULL COMMENT '金额',
  amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金',
  discount DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '折扣(%)',
  price_components JSON NULL COMMENT '价格组成项（复杂模式）',
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

-- 23. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL COMMENT '订单编号',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  contract_id BIGINT NULL COMMENT '合同ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  order_date DATE NOT NULL COMMENT '下单日期',
  delivery_date DATE NULL COMMENT '交付日期',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
  total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税总金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金合计',
  status ENUM('draft','pending_approval','approved','active','rejected','pending','confirmed','processing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'draft' COMMENT '订单状态',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_orders_tenant_id (tenant_id),
  INDEX idx_orders_customer_id (customer_id),
  INDEX idx_orders_contract_id (contract_id),
  INDEX idx_orders_opportunity_id (opportunity_id),
  INDEX idx_orders_order_number (order_number),
  INDEX idx_orders_status (status),
  INDEX idx_orders_ownerId (ownerId),
  INDEX idx_orders_department_id (department_id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 24. 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL COMMENT '订单ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
  packaging_unit VARCHAR(50) NULL COMMENT '包装单位（显示用）',
  packaging_spec VARCHAR(200) NULL COMMENT '包装规格说明（显示用，如：1袋=25kg）',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '税率(%)',
  unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税单价',
  amount DECIMAL(10,2) NOT NULL COMMENT '金额',
  amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金',
  discount DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '折扣(%)',
  price_components JSON NULL COMMENT '价格组成项（复杂模式）',
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

-- 25. 合同表
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
  total_amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税总金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金合计',
  sign_date DATE NULL COMMENT '签署日期',
  effective_date DATE NULL COMMENT '生效日期',
  expiry_date DATE NULL COMMENT '到期日期',
  content TEXT NULL COMMENT '合同内容/条款',
  attachments JSON NULL COMMENT '附件列表（JSON数组）',
  template_id BIGINT NULL COMMENT '合同模板ID',
  notes TEXT NULL COMMENT '备注',
  ownerId BIGINT NULL COMMENT '负责人ID',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
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
  INDEX idx_contracts_department_id (department_id),
  CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contracts_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同表';

-- 26. 合同明细表
CREATE TABLE IF NOT EXISTS contract_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL COMMENT '合同ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
  packaging_unit VARCHAR(50) NULL COMMENT '包装单位（显示用）',
  packaging_spec VARCHAR(200) NULL COMMENT '包装规格说明（显示用，如：1袋=25kg）',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '税率(%)',
  unit_price_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税单价',
  amount DECIMAL(10,2) NOT NULL COMMENT '金额',
  amount_excl_tax DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '不含税金额',
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '税金',
  discount DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '折扣(%)',
  price_components JSON NULL COMMENT '价格组成项（复杂模式）',
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

-- 27. 合同模板表
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

-- 28. 合同审批表
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

-- 29. 拜访记录表
CREATE TABLE IF NOT EXISTS visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '拜访ID',
  description TEXT NULL COMMENT '拜访描述',
  type ENUM('first_visit', 'follow_up', 'maintenance', 'business_negotiation', 'technical_support', 'training', 'other') NOT NULL DEFAULT 'follow_up' COMMENT '拜访类型',
  status ENUM('planned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'planned' COMMENT '拜访状态',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  planned_start_time DATETIME NOT NULL COMMENT '计划开始时间',
  planned_end_time DATETIME NOT NULL COMMENT '计划结束时间',
  actual_start_time DATETIME NULL COMMENT '实际开始时间',
  actual_end_time DATETIME NULL COMMENT '实际结束时间',
  check_in_time DATETIME NULL COMMENT '签到时间',
  region JSON NULL COMMENT '所在地区（省市区）',
  detail_address VARCHAR(500) NULL COMMENT '详情地址',
  purpose ENUM('understand_needs','monthly_performance','performance_increment','product_promotion','holiday_visit','contract_signing','sign_statement','price_policy','after_sales_service','negotiate_cooperation','understand_business','sample_tracking') NULL COMMENT '拜访目的',
  result TEXT NULL COMMENT '拜访结果/反馈',
  feedback TEXT NULL COMMENT '客户反馈',
  next_action TEXT NULL COMMENT '下一步行动计划',
  customer_id BIGINT NULL COMMENT '客户ID',
  contact_id BIGINT NULL COMMENT '联系人ID',
  opportunity_id BIGINT NULL COMMENT '商机ID',
  activity_id BIGINT NULL COMMENT '关联活动ID',
  expenses JSON NULL COMMENT '拜访费用',
  attachments JSON NULL COMMENT '拜访附件',
  check_in_photo VARCHAR(500) NULL COMMENT '签到照片URL',
  participants JSON NULL COMMENT '参与人员（成员ID数组）',
  owner_id BIGINT NOT NULL COMMENT '负责人ID',
  assigned_by BIGINT NULL COMMENT '分配人(成员ID)',
  department_id BIGINT NULL COMMENT '部门ID',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_by BIGINT NULL COMMENT '创建者ID（成员ID）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_visits_customer_id (customer_id),
  INDEX idx_visits_contact_id (contact_id),
  INDEX idx_visits_opportunity_id (opportunity_id),
  INDEX idx_visits_activity_id (activity_id),
  INDEX idx_visits_owner_id (owner_id),
  INDEX idx_visits_department_id (department_id),
  INDEX idx_visits_tenant_id (tenant_id),
  INDEX idx_visits_status (status),
  INDEX idx_visits_type (type),
  INDEX idx_visits_planned_start_time (planned_start_time),
  INDEX idx_visits_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拜访记录表';

-- 30. 客户需求表
CREATE TABLE IF NOT EXISTS customer_requirements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '需求ID',
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  type ENUM('explicit', 'implicit', 'intangible') NOT NULL COMMENT '需求类型：显性需求（客户提出的需求）、隐性需求（客户可能会有的需求）、无形需求（需要自己主动发现）',
  content VARCHAR(500) NOT NULL COMMENT '需求内容',
  problem_to_solve TEXT NULL COMMENT '需求背后要解决的问题',
  tags JSON NULL COMMENT '需求标签（如：价格、质量、技术支持等）',
  priority INT NOT NULL DEFAULT 0 COMMENT '优先级：0-低，1-中，2-高',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理，processing-处理中，resolved-已解决，closed-已关闭',
  resolved_at TIMESTAMP NULL COMMENT '解决时间',
  resolved_by BIGINT NULL COMMENT '解决人ID',
  notes TEXT NULL COMMENT '备注',
  tenant_id BIGINT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_customer_requirements_customer_id (customer_id),
  INDEX idx_customer_requirements_type (type),
  INDEX idx_customer_requirements_status (status),
  INDEX idx_customer_requirements_priority (priority),
  INDEX idx_customer_requirements_tenant_id (tenant_id),
  INDEX idx_customer_requirements_deleted_at (deleted_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户需求表';

-- 31. 客户合作习惯与信用信息扩展表
CREATE TABLE IF NOT EXISTS customer_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  invoice_requirement ENUM('special_vat', 'normal_invoice', 'no_invoice') NULL DEFAULT NULL COMMENT '开票要求：专票/普票/不开票',
  invoice_remark VARCHAR(500) NULL DEFAULT NULL COMMENT '开票说明',
  shipping_methods JSON NULL DEFAULT NULL COMMENT '货运方式数组：专车/物流/自提/快递',
  main_category_ids JSON NULL DEFAULT NULL COMMENT '主要采购品类ID数组（关联dict_items.id）',
  competitor_brands JSON NULL DEFAULT NULL COMMENT '意向竞品品牌数组',
  credit_limit DECIMAL(10,2) NULL DEFAULT NULL COMMENT '信用额度（元）',
  credit_tier ENUM('tier_150k', 'tier_100k', 'tier_50k', 'none') NULL DEFAULT NULL COMMENT '信用额度档位：15万/10万/5万/无',
  tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_customer_profiles_customer_id (customer_id),
  INDEX idx_customer_profiles_tenant_id (tenant_id),
  INDEX idx_customer_profiles_deleted_at (deleted_at),
  CONSTRAINT fk_customer_profiles_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户合作习惯与信用信息扩展表';

-- 32. 客户信用变更历史表
CREATE TABLE IF NOT EXISTS customer_credit_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  old_limit DECIMAL(10,2) NULL DEFAULT NULL COMMENT '原信用额度',
  new_limit DECIMAL(10,2) NULL DEFAULT NULL COMMENT '新信用额度',
  old_tier VARCHAR(20) NULL DEFAULT NULL COMMENT '原额度档位',
  new_tier VARCHAR(20) NULL DEFAULT NULL COMMENT '新额度档位',
  old_rating VARCHAR(10) NULL DEFAULT NULL COMMENT '原客户等级（来自customers.level）',
  new_rating VARCHAR(10) NULL DEFAULT NULL COMMENT '新客户等级（来自customers.level）',
  change_reason VARCHAR(500) NULL DEFAULT NULL COMMENT '变更原因',
  changed_by BIGINT NULL DEFAULT NULL COMMENT '变更人ID（关联members.id）',
  tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  INDEX idx_customer_credit_history_customer_id (customer_id),
  INDEX idx_customer_credit_history_tenant_id (tenant_id),
  INDEX idx_customer_credit_history_created_at (created_at),
  CONSTRAINT fk_customer_credit_history_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_credit_history_member FOREIGN KEY (changed_by) REFERENCES members (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信用变更历史表';

-- 33. 字典类型表
CREATE TABLE IF NOT EXISTS dict_types (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID（NULL为系统级）',
  code VARCHAR(100) NOT NULL COMMENT '字典类型编码（在租户内唯一）',
  name VARCHAR(100) NOT NULL COMMENT '字典类型名称',
  description TEXT NULL DEFAULT NULL COMMENT '描述',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_dict_types_tenant_code (tenant_id, code),
  INDEX idx_dict_types_tenant_id (tenant_id),
  INDEX idx_dict_types_code (code),
  INDEX idx_dict_types_status (status),
  INDEX idx_dict_types_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

-- 34. 字典项表
CREATE TABLE IF NOT EXISTS dict_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID（NULL为系统级）',
  type_code VARCHAR(100) NOT NULL COMMENT '字典类型编码',
  value VARCHAR(100) NOT NULL COMMENT '编码值，用于业务逻辑和拼接',
  label VARCHAR(200) NOT NULL COMMENT '显示名称',
  parent_id BIGINT NULL DEFAULT NULL COMMENT '父级字典项ID，用于层级结构',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序号',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态：active/inactive',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_dict_items_tenant_type_value (tenant_id, type_code, value),
  INDEX idx_dict_items_tenant_id (tenant_id),
  INDEX idx_dict_items_type_code (type_code),
  INDEX idx_dict_items_parent_id (parent_id),
  INDEX idx_dict_items_status (status),
  INDEX idx_dict_items_deleted_at (deleted_at),
  INDEX idx_dict_items_sort_order (sort_order),
  FOREIGN KEY (parent_id) REFERENCES dict_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- 35. 审批流模板表
CREATE TABLE IF NOT EXISTS workflow_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '模板名称',
  description TEXT NULL COMMENT '模板描述',
  business_type ENUM('quote', 'contract', 'order') NOT NULL COMMENT '业务类型',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  version INT NOT NULL DEFAULT 1 COMMENT '版本号',
  tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_business_type (business_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流模板表';

-- 36. 审批流节点表
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '节点名称',
  node_order INT NOT NULL COMMENT '节点顺序',
  node_type ENUM('fixed_member', 'role', 'department_manager') NOT NULL COMMENT '节点类型',
  approval_mode ENUM('sequential', 'parallel') NOT NULL DEFAULT 'sequential' COMMENT '审批方式',
  approver_config JSON NOT NULL COMMENT '审批人配置',
  template_id BIGINT UNSIGNED NOT NULL COMMENT '审批流模板ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  INDEX idx_template_id (template_id),
  INDEX idx_node_order (node_order),
  CONSTRAINT fk_workflow_nodes_template FOREIGN KEY (template_id) REFERENCES workflow_templates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流节点表';

-- 37. 审批实例表
CREATE TABLE IF NOT EXISTS workflow_instances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_type ENUM('quote', 'contract', 'order') NOT NULL COMMENT '业务类型',
  business_id BIGINT UNSIGNED NOT NULL COMMENT '业务对象ID',
  template_id BIGINT UNSIGNED NOT NULL COMMENT '审批流模板ID',
  status ENUM('pending', 'approved', 'rejected', 'cancelled', 'returned') NOT NULL DEFAULT 'pending' COMMENT '审批状态',
  current_node_id BIGINT UNSIGNED NULL COMMENT '当前审批节点ID',
  current_node_order INT NULL COMMENT '当前节点顺序',
  initiator_id BIGINT NOT NULL COMMENT '发起人ID',
  submit_comment TEXT NULL COMMENT '提交说明',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  INDEX idx_business (business_type, business_id),
  INDEX idx_template_id (template_id),
  INDEX idx_status (status),
  INDEX idx_initiator_id (initiator_id),
  INDEX idx_tenant_id (tenant_id),
  CONSTRAINT fk_workflow_instances_template FOREIGN KEY (template_id) REFERENCES workflow_templates (id),
  CONSTRAINT fk_workflow_instances_initiator FOREIGN KEY (initiator_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批实例表';

-- 38. 审批记录表
CREATE TABLE IF NOT EXISTS workflow_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instance_id BIGINT UNSIGNED NOT NULL COMMENT '审批实例ID',
  node_id BIGINT UNSIGNED NULL COMMENT '审批节点ID',
  node_order INT NULL COMMENT '节点顺序',
  approver_id BIGINT NOT NULL COMMENT '审批人ID',
  action ENUM('pending', 'approve', 'reject', 'transfer', 'add_sign', 'return', 'cancel') NOT NULL COMMENT '审批动作',
  comment TEXT NULL COMMENT '审批意见',
  extra_data JSON NULL COMMENT '额外数据',
  action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  INDEX idx_instance_id (instance_id),
  INDEX idx_node_id (node_id),
  INDEX idx_approver_id (approver_id),
  INDEX idx_action (action),
  INDEX idx_tenant_id (tenant_id),
  CONSTRAINT fk_workflow_records_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances (id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_records_node FOREIGN KEY (node_id) REFERENCES workflow_nodes (id),
  CONSTRAINT fk_workflow_records_approver FOREIGN KEY (approver_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

-- 39. 工商信息主表
CREATE TABLE IF NOT EXISTS business_info (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  customer_id BIGINT NULL DEFAULT NULL COMMENT '客户ID',
  unified_social_credit_code VARCHAR(255) NULL DEFAULT NULL COMMENT '统一社会信用代码',
  company_name VARCHAR(255) NULL DEFAULT NULL COMMENT '企业名称',
  legal_representative VARCHAR(255) NULL DEFAULT NULL COMMENT '法定代表人',
  operating_status VARCHAR(255) NULL DEFAULT NULL COMMENT '经营状态',
  registered_capital DECIMAL(20,2) NULL DEFAULT NULL COMMENT '注册资本',
  paid_in_capital DECIMAL(20,2) NULL DEFAULT NULL COMMENT '实缴资本',
  business_registration_number VARCHAR(255) NULL DEFAULT NULL COMMENT '工商注册号',
  organization_code VARCHAR(255) NULL DEFAULT NULL COMMENT '组织机构代码',
  establishment_date DATE NULL DEFAULT NULL COMMENT '成立日期',
  company_type VARCHAR(255) NULL DEFAULT NULL COMMENT '企业类型',
  business_term VARCHAR(255) NULL DEFAULT NULL COMMENT '营业期限',
  registration_authority VARCHAR(255) NULL DEFAULT NULL COMMENT '登记机关',
  approval_date DATE NULL DEFAULT NULL COMMENT '核准日期',
  registered_address TEXT NULL DEFAULT NULL COMMENT '注册地址',
  business_scope TEXT NULL DEFAULT NULL COMMENT '经营范围',
  last_sync_time TIMESTAMP NULL DEFAULT NULL COMMENT '最后同步时间',
  expires_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
  tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_info_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工商信息主表';

-- 40. 主要人员表
CREATE TABLE IF NOT EXISTS business_personnel (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  business_info_id BIGINT NOT NULL COMMENT '工商信息ID',
  name VARCHAR(255) NULL DEFAULT NULL COMMENT '姓名',
  position VARCHAR(255) NULL DEFAULT NULL COMMENT '职务',
  PRIMARY KEY (id),
  INDEX idx_business_info_id (business_info_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_personnel_business_info FOREIGN KEY (business_info_id) REFERENCES business_info (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主要人员表';

-- 41. 股东信息表
CREATE TABLE IF NOT EXISTS business_shareholders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  business_info_id BIGINT NOT NULL COMMENT '工商信息ID',
  shareholder_name VARCHAR(255) NULL DEFAULT NULL COMMENT '股东名称',
  shareholding_ratio DECIMAL(10,4) NULL DEFAULT NULL COMMENT '持股比例(%)',
  shareholder_type VARCHAR(255) NULL DEFAULT NULL COMMENT '股东类型',
  investment_amount DECIMAL(20,2) NULL DEFAULT NULL COMMENT '投资金额(万元)',
  PRIMARY KEY (id),
  INDEX idx_business_info_id (business_info_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_shareholders_business_info FOREIGN KEY (business_info_id) REFERENCES business_info (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股东信息表';

-- 42. 分支机构表
CREATE TABLE IF NOT EXISTS business_branches (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  business_info_id BIGINT NOT NULL COMMENT '工商信息ID',
  company_name VARCHAR(255) NULL DEFAULT NULL COMMENT '公司名称',
  person_in_charge VARCHAR(255) NULL DEFAULT NULL COMMENT '负责人',
  establishment_date DATE NULL DEFAULT NULL COMMENT '成立时间',
  operating_status VARCHAR(255) NULL DEFAULT NULL COMMENT '经营状态',
  PRIMARY KEY (id),
  INDEX idx_business_info_id (business_info_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_branches_business_info FOREIGN KEY (business_info_id) REFERENCES business_info (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支机构表';

-- 43. 对外投资表
CREATE TABLE IF NOT EXISTS business_investments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  business_info_id BIGINT NOT NULL COMMENT '工商信息ID',
  invested_company VARCHAR(255) NULL DEFAULT NULL COMMENT '被投资企业',
  shareholder_type VARCHAR(255) NULL DEFAULT NULL COMMENT '股东类型',
  shareholding_ratio DECIMAL(10,4) NULL DEFAULT NULL COMMENT '持股比例(%)',
  investment_amount DECIMAL(20,2) NULL DEFAULT NULL COMMENT '投资金额(万元)',
  PRIMARY KEY (id),
  INDEX idx_business_info_id (business_info_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_investments_business_info FOREIGN KEY (business_info_id) REFERENCES business_info (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对外投资表';

-- 44. 变更记录表
CREATE TABLE IF NOT EXISTS business_change_records (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  business_info_id BIGINT NOT NULL COMMENT '工商信息ID',
  change_date DATE NULL DEFAULT NULL COMMENT '变更日期',
  change_item VARCHAR(255) NULL DEFAULT NULL COMMENT '变更事项',
  before_change TEXT NULL DEFAULT NULL COMMENT '变更前',
  after_change TEXT NULL DEFAULT NULL COMMENT '变更后',
  PRIMARY KEY (id),
  INDEX idx_business_info_id (business_info_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_business_change_records_business_info FOREIGN KEY (business_info_id) REFERENCES business_info (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='变更记录表';

-- 45. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  receiver_id BIGINT NOT NULL COMMENT '接收者ID（用户ID）',
  type ENUM('workflow', 'system', 'task', 'message', 'reminder') NOT NULL DEFAULT 'workflow' COMMENT '通知类型',
  title VARCHAR(255) NOT NULL COMMENT '标题',
  content TEXT NOT NULL COMMENT '内容',
  metadata JSON NULL COMMENT '扩展数据（如业务ID、链接等）',
  status ENUM('unread', 'read') NOT NULL DEFAULT 'unread' COMMENT '状态',
  read_at TIMESTAMP NULL DEFAULT NULL COMMENT '阅读时间',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_notifications_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 46. 通知设置表
CREATE TABLE IF NOT EXISTS notification_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  type ENUM('workflow', 'system', 'task', 'message', 'reminder') NOT NULL COMMENT '通知类型',
  channel ENUM('in_app', 'email', 'sms') NOT NULL COMMENT '通知渠道',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_type_channel (user_id, type, channel),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_channel (channel),
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知设置表';

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

-- 插入产品品类字典数据
INSERT INTO dict_types (code, name, description, status, created_at, updated_at)
SELECT 'product_category', '产品品类', '客户主要采购的产品品类', 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM dict_types WHERE code = 'product_category'
);

INSERT INTO dict_items (tenant_id, type_code, value, label, sort_order, status, created_at, updated_at)
SELECT NULL, 'product_category', 'hot_melt', '热熔类', 1, 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items WHERE type_code = 'product_category' AND value = 'hot_melt'
);

INSERT INTO dict_items (tenant_id, type_code, value, label, sort_order, status, created_at, updated_at)
SELECT NULL, 'product_category', 'rongyao', '容槽物料', 2, 'active', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM dict_items WHERE type_code = 'product_category' AND value = 'rongyao'
);

-- 输出初始化完成信息
SELECT 'CRM数据库初始化完成！' as message;
SELECT '包含46个数据表：' as info;
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
SELECT '19. target (目标表)' as table_info UNION ALL
SELECT '20. products (产品表)' as table_info UNION ALL
SELECT '21. quotes (报价表)' as table_info UNION ALL
SELECT '22. quote_items (报价明细表)' as table_info UNION ALL
SELECT '23. orders (订单表)' as table_info UNION ALL
SELECT '24. order_items (订单明细表)' as table_info UNION ALL
SELECT '25. contracts (合同表)' as table_info UNION ALL
SELECT '26. contract_items (合同明细表)' as table_info UNION ALL
SELECT '27. contract_templates (合同模板表)' as table_info UNION ALL
SELECT '28. contract_approvals (合同审批表)' as table_info UNION ALL
SELECT '29. visits (拜访记录表)' as table_info UNION ALL
SELECT '30. customer_requirements (客户需求表)' as table_info UNION ALL
SELECT '31. customer_profiles (客户合作习惯与信用信息扩展表)' as table_info UNION ALL
SELECT '32. customer_credit_history (客户信用变更历史表)' as table_info UNION ALL
SELECT '33. dict_types (字典类型表)' as table_info UNION ALL
SELECT '34. dict_items (字典项表)' as table_info UNION ALL
SELECT '35. workflow_templates (审批流模板表)' as table_info UNION ALL
SELECT '36. workflow_nodes (审批流节点表)' as table_info UNION ALL
SELECT '37. workflow_instances (审批实例表)' as table_info UNION ALL
SELECT '38. workflow_records (审批记录表)' as table_info UNION ALL
SELECT '39. business_info (工商信息主表)' as table_info UNION ALL
SELECT '40. business_personnel (主要人员表)' as table_info UNION ALL
SELECT '41. business_shareholders (股东信息表)' as table_info UNION ALL
SELECT '42. business_branches (分支机构表)' as table_info UNION ALL
SELECT '43. business_investments (对外投资表)' as table_info UNION ALL
SELECT '44. business_change_records (变更记录表)' as table_info UNION ALL
SELECT '45. notifications (通知表)' as table_info UNION ALL
SELECT '46. notification_settings (通知设置表)' as table_info;
