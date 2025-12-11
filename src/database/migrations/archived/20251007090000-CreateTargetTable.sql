-- Create target table
CREATE TABLE IF NOT EXISTS `target` (
  `id` VARCHAR(36) PRIMARY KEY,
`tenant_id` VARCHAR(36) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_value` DECIMAL(20,2) NOT NULL,
  `current_value` DECIMAL(20,2) DEFAULT 0,
  `unit` VARCHAR(20) DEFAULT '元',
  `target_month` DATE NOT NULL,
  `owner_type` ENUM('tenant','department','member') NOT NULL,
`owner_id` VARCHAR(36) NOT NULL,
  `completion_rate` DECIMAL(5,2) DEFAULT 0,
  `status` ENUM('active','completed') DEFAULT 'active',
`created_by` VARCHAR(36) NOT NULL,
`updated_by` VARCHAR(36) NULL,
`createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
`updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
`deletedAt` DATETIME NULL,
CONSTRAINT `fk_target_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
CONSTRAINT `fk_target_created_by` FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_target` (`tenant_id`,`owner_type`,`owner_id`,`target_type`,`target_month`),
  INDEX `idx_tenant_month` (`tenant_id`,`target_month`)
) COMMENT='目标表(按月存储)';

-- 标记版本（供外部调试用，不影响执行）
-- SELECT '20251007090000-CreateTargetTable' as version;


