-- Migration: CreateVisitsTable
-- Version: 20251118012331
-- Description: 创建拜访记录表，支持GPS定位、位置签到、费用记录等功能

-- 检查表是否存在
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits');

SET @sql = IF(@table_exists = 0, 
  CONCAT('CREATE TABLE visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT ''拜访ID'',
    title VARCHAR(255) NOT NULL COMMENT ''拜访标题'',
    description TEXT NULL COMMENT ''拜访描述'',
    type ENUM(''first_visit'', ''follow_up'', ''maintenance'', ''business_negotiation'', ''technical_support'', ''training'', ''other'') NOT NULL DEFAULT ''follow_up'' COMMENT ''拜访类型'',
    status ENUM(''planned'', ''in_progress'', ''completed'', ''cancelled'') NOT NULL DEFAULT ''planned'' COMMENT ''拜访状态'',
    priority ENUM(''low'', ''medium'', ''high'', ''urgent'') NOT NULL DEFAULT ''medium'' COMMENT ''优先级'',
    planned_start_time DATETIME NOT NULL COMMENT ''计划开始时间'',
    planned_end_time DATETIME NOT NULL COMMENT ''计划结束时间'',
    actual_start_time DATETIME NULL COMMENT ''实际开始时间'',
    actual_end_time DATETIME NULL COMMENT ''实际结束时间'',
    check_in_time DATETIME NULL COMMENT ''签到时间'',
    location VARCHAR(500) NULL COMMENT ''拜访地点（地址）'',
    latitude DECIMAL(10, 7) NULL COMMENT ''计划地点纬度'',
    longitude DECIMAL(10, 7) NULL COMMENT ''计划地点经度'',
    check_in_latitude DECIMAL(10, 7) NULL COMMENT ''签到地点纬度'',
    check_in_longitude DECIMAL(10, 7) NULL COMMENT ''签到地点经度'',
    check_in_distance DECIMAL(10, 2) NULL COMMENT ''签到距离偏差（米）'',
    purpose VARCHAR(500) NULL COMMENT ''拜访目的'',
    result TEXT NULL COMMENT ''拜访结果/反馈'',
    feedback TEXT NULL COMMENT ''客户反馈'',
    next_action TEXT NULL COMMENT ''下一步行动计划'',
    customer_id BIGINT NULL COMMENT ''客户ID'',
    contact_id BIGINT NULL COMMENT ''联系人ID'',
    opportunity_id BIGINT NULL COMMENT ''商机ID'',
    activity_id BIGINT NULL COMMENT ''关联活动ID'',
    expenses JSON NULL COMMENT ''拜访费用'',
    attachments JSON NULL COMMENT ''拜访附件'',
    check_in_photo VARCHAR(500) NULL COMMENT ''签到照片URL'',
    participants JSON NULL COMMENT ''参与人员（成员ID数组）'',
    owner_id BIGINT NOT NULL COMMENT ''负责人ID'',
    assigned_by BIGINT NULL COMMENT ''分配人(成员ID)'',
    tenant_id BIGINT NULL COMMENT ''租户ID'',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'',
    deleted_at TIMESTAMP NULL COMMENT ''删除时间'',
    INDEX idx_visits_customer_id (customer_id),
    INDEX idx_visits_contact_id (contact_id),
    INDEX idx_visits_opportunity_id (opportunity_id),
    INDEX idx_visits_activity_id (activity_id),
    INDEX idx_visits_owner_id (owner_id),
    INDEX idx_visits_tenant_id (tenant_id),
    INDEX idx_visits_status (status),
    INDEX idx_visits_type (type),
    INDEX idx_visits_planned_start_time (planned_start_time),
    INDEX idx_visits_deleted_at (deleted_at),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''拜访记录表'';'),
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句
-- DROP TABLE IF EXISTS visits;

