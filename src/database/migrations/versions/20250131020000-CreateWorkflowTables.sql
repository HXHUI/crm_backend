-- 创建审批流模板表
CREATE TABLE IF NOT EXISTS `workflow_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '模板名称',
  `description` TEXT NULL COMMENT '模板描述',
  `business_type` ENUM('quote', 'contract', 'order') NOT NULL COMMENT '业务类型',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_business_type` (`business_type`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流模板表';

-- 创建审批流节点表
CREATE TABLE IF NOT EXISTS `workflow_nodes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '节点名称',
  `node_order` INT NOT NULL COMMENT '节点顺序',
  `node_type` ENUM('fixed_member', 'role', 'department_manager') NOT NULL COMMENT '节点类型',
  `approval_mode` ENUM('sequential', 'parallel') NOT NULL DEFAULT 'sequential' COMMENT '审批方式',
  `approver_config` JSON NOT NULL COMMENT '审批人配置',
  `template_id` BIGINT UNSIGNED NOT NULL COMMENT '审批流模板ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  INDEX `idx_template_id` (`template_id`),
  INDEX `idx_node_order` (`node_order`),
  CONSTRAINT `fk_workflow_nodes_template` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流节点表';

-- 创建审批实例表
CREATE TABLE IF NOT EXISTS `workflow_instances` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_type` ENUM('quote', 'contract', 'order') NOT NULL COMMENT '业务类型',
  `business_id` BIGINT UNSIGNED NOT NULL COMMENT '业务对象ID',
  `template_id` BIGINT UNSIGNED NOT NULL COMMENT '审批流模板ID',
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled', 'returned') NOT NULL DEFAULT 'pending' COMMENT '审批状态',
  `current_node_id` BIGINT UNSIGNED NULL COMMENT '当前审批节点ID',
  `current_node_order` INT NULL COMMENT '当前节点顺序',
  `initiator_id` BIGINT NOT NULL COMMENT '发起人ID',
  `submit_comment` TEXT NULL COMMENT '提交说明',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  INDEX `idx_business` (`business_type`, `business_id`),
  INDEX `idx_template_id` (`template_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_initiator_id` (`initiator_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_workflow_instances_template` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`),
  CONSTRAINT `fk_workflow_instances_initiator` FOREIGN KEY (`initiator_id`) REFERENCES `members` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批实例表';

-- 创建审批记录表
CREATE TABLE IF NOT EXISTS `workflow_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `instance_id` BIGINT UNSIGNED NOT NULL COMMENT '审批实例ID',
  `node_id` BIGINT UNSIGNED NULL COMMENT '审批节点ID',
  `node_order` INT NULL COMMENT '节点顺序',
  `approver_id` BIGINT NOT NULL COMMENT '审批人ID',
  `action` ENUM('pending', 'approve', 'reject', 'transfer', 'add_sign', 'return', 'cancel') NOT NULL COMMENT '审批动作',
  `comment` TEXT NULL COMMENT '审批意见',
  `extra_data` JSON NULL COMMENT '额外数据',
  `action_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  INDEX `idx_instance_id` (`instance_id`),
  INDEX `idx_node_id` (`node_id`),
  INDEX `idx_approver_id` (`approver_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_workflow_records_instance` FOREIGN KEY (`instance_id`) REFERENCES `workflow_instances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workflow_records_node` FOREIGN KEY (`node_id`) REFERENCES `workflow_nodes` (`id`),
  CONSTRAINT `fk_workflow_records_approver` FOREIGN KEY (`approver_id`) REFERENCES `members` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

