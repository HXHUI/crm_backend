-- Migration: CreateBusinessInfoTables
-- Version: 20251127000000
-- Description: 创建工商信息相关表（主表、主要人员、股东信息、分支机构、对外投资、变更记录）

-- 创建工商信息主表
CREATE TABLE IF NOT EXISTS `business_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `customer_id` BIGINT NULL DEFAULT NULL COMMENT '客户ID',
  `unified_social_credit_code` VARCHAR(255) NULL DEFAULT NULL COMMENT '统一社会信用代码',
  `company_name` VARCHAR(255) NULL DEFAULT NULL COMMENT '企业名称',
  `legal_representative` VARCHAR(255) NULL DEFAULT NULL COMMENT '法定代表人',
  `operating_status` VARCHAR(255) NULL DEFAULT NULL COMMENT '经营状态',
  `registered_capital` DECIMAL(20,2) NULL DEFAULT NULL COMMENT '注册资本',
  `paid_in_capital` DECIMAL(20,2) NULL DEFAULT NULL COMMENT '实缴资本',
  `business_registration_number` VARCHAR(255) NULL DEFAULT NULL COMMENT '工商注册号',
  `organization_code` VARCHAR(255) NULL DEFAULT NULL COMMENT '组织机构代码',
  `establishment_date` DATE NULL DEFAULT NULL COMMENT '成立日期',
  `company_type` VARCHAR(255) NULL DEFAULT NULL COMMENT '企业类型',
  `business_term` VARCHAR(255) NULL DEFAULT NULL COMMENT '营业期限',
  `registration_authority` VARCHAR(255) NULL DEFAULT NULL COMMENT '登记机关',
  `approval_date` DATE NULL DEFAULT NULL COMMENT '核准日期',
  `registered_address` TEXT NULL DEFAULT NULL COMMENT '注册地址',
  `business_scope` TEXT NULL DEFAULT NULL COMMENT '经营范围',
  `last_sync_time` TIMESTAMP NULL DEFAULT NULL COMMENT '最后同步时间',
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
  `tenant_id` BIGINT NULL DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_info_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工商信息主表';

-- 创建主要人员表
CREATE TABLE IF NOT EXISTS `business_personnel` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `business_info_id` BIGINT NOT NULL COMMENT '工商信息ID',
  `name` VARCHAR(255) NULL DEFAULT NULL COMMENT '姓名',
  `position` VARCHAR(255) NULL DEFAULT NULL COMMENT '职务',
  PRIMARY KEY (`id`),
  INDEX `idx_business_info_id` (`business_info_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_personnel_business_info` FOREIGN KEY (`business_info_id`) REFERENCES `business_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主要人员表';

-- 创建股东信息表
CREATE TABLE IF NOT EXISTS `business_shareholders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `business_info_id` BIGINT NOT NULL COMMENT '工商信息ID',
  `shareholder_name` VARCHAR(255) NULL DEFAULT NULL COMMENT '股东名称',
  `shareholding_ratio` DECIMAL(10,4) NULL DEFAULT NULL COMMENT '持股比例(%)',
  `shareholder_type` VARCHAR(255) NULL DEFAULT NULL COMMENT '股东类型',
  `investment_amount` DECIMAL(20,2) NULL DEFAULT NULL COMMENT '投资金额(万元)',
  PRIMARY KEY (`id`),
  INDEX `idx_business_info_id` (`business_info_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_shareholders_business_info` FOREIGN KEY (`business_info_id`) REFERENCES `business_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股东信息表';

-- 创建分支机构表
CREATE TABLE IF NOT EXISTS `business_branches` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `business_info_id` BIGINT NOT NULL COMMENT '工商信息ID',
  `company_name` VARCHAR(255) NULL DEFAULT NULL COMMENT '公司名称',
  `person_in_charge` VARCHAR(255) NULL DEFAULT NULL COMMENT '负责人',
  `establishment_date` DATE NULL DEFAULT NULL COMMENT '成立时间',
  `operating_status` VARCHAR(255) NULL DEFAULT NULL COMMENT '经营状态',
  PRIMARY KEY (`id`),
  INDEX `idx_business_info_id` (`business_info_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_branches_business_info` FOREIGN KEY (`business_info_id`) REFERENCES `business_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支机构表';

-- 创建对外投资表
CREATE TABLE IF NOT EXISTS `business_investments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `business_info_id` BIGINT NOT NULL COMMENT '工商信息ID',
  `invested_company` VARCHAR(255) NULL DEFAULT NULL COMMENT '被投资企业',
  `shareholder_type` VARCHAR(255) NULL DEFAULT NULL COMMENT '股东类型',
  `shareholding_ratio` DECIMAL(10,4) NULL DEFAULT NULL COMMENT '持股比例(%)',
  `investment_amount` DECIMAL(20,2) NULL DEFAULT NULL COMMENT '投资金额(万元)',
  PRIMARY KEY (`id`),
  INDEX `idx_business_info_id` (`business_info_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_investments_business_info` FOREIGN KEY (`business_info_id`) REFERENCES `business_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对外投资表';

-- 创建变更记录表
CREATE TABLE IF NOT EXISTS `business_change_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `business_info_id` BIGINT NOT NULL COMMENT '工商信息ID',
  `change_date` DATE NULL DEFAULT NULL COMMENT '变更日期',
  `change_item` VARCHAR(255) NULL DEFAULT NULL COMMENT '变更事项',
  `before_change` TEXT NULL DEFAULT NULL COMMENT '变更前',
  `after_change` TEXT NULL DEFAULT NULL COMMENT '变更后',
  PRIMARY KEY (`id`),
  INDEX `idx_business_info_id` (`business_info_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_business_change_records_business_info` FOREIGN KEY (`business_info_id`) REFERENCES `business_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='变更记录表';

