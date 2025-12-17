-- 创建方案优化库表
CREATE TABLE IF NOT EXISTS `solution_library` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL COMMENT '租户ID',
  
  -- 关联来源（多态关联）
  `source_type` VARCHAR(50) NOT NULL COMMENT '来源类型：customer/opportunity',
  `source_id` BIGINT NOT NULL COMMENT '来源ID（客户ID或商机ID）',
  
  -- 方案基本信息
  `title` VARCHAR(200) NOT NULL COMMENT '方案标题（自动生成或手动填写）',
  `industry` VARCHAR(50) NULL COMMENT '行业（字典key）',
  `customer_type` VARCHAR(50) NULL COMMENT '客户类型/规模',
  `application_scenario` VARCHAR(200) NULL COMMENT '应用场景（简要描述）',
  
  -- 关联的关键信息（用于后续匹配推荐）
  `requirement_tags` JSON NULL COMMENT '关联的需求标签（从customer_requirements.tags提取）',
  `competitor_ids` JSON NULL COMMENT '关联的竞品ID列表（从customer_competitors提取）',
  `competitors` JSON NULL COMMENT '竞品详细信息列表',
  `alternative_ids` JSON NULL COMMENT '使用的可替代产品ID列表（从competitor_alternatives提取）',
  `alternatives` JSON NULL COMMENT '可替代产品详细信息列表',
  
  -- 方案内容
  `product_list` JSON NULL COMMENT '使用的产品清单（从报价/合同提取：产品ID、名称、规格、数量、单价等）',
  `pricing_strategy` TEXT NULL COMMENT '价格策略说明',
  `service_strategy` TEXT NULL COMMENT '服务策略说明（技术支持、交期、付款条件等）',
  `technical_solution` TEXT NULL COMMENT '技术方案说明（配方、工艺等，如适用）',
  
  -- 结果与复盘
  `result` VARCHAR(20) NOT NULL COMMENT '结果：won/lost/on_hold',
  `win_reasons` JSON NULL COMMENT '成功原因（多选）：price/technology/delivery/relationship/service/other',
  `lose_reasons` JSON NULL COMMENT '失败原因（多选）：price/technology/delivery/relationship/budget_change/competitor/other',
  `key_feedback` TEXT NULL COMMENT '客户关键反馈',
  `lessons_learned` TEXT NULL COMMENT '经验教训总结',
  
  -- 统计与推荐权重
  `usage_count` INT DEFAULT 0 COMMENT '被引用次数',
  `success_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '成功率（基于引用后的结果统计）',
  `last_used_at` DATETIME NULL COMMENT '最后使用时间',
  
  -- 元数据
  `created_by` BIGINT NULL COMMENT '创建者（成员ID）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  
  INDEX `idx_tenant_source` (`tenant_id`, `source_type`, `source_id`),
  INDEX `idx_industry_result` (`tenant_id`, `industry`, `result`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='方案优化库';

