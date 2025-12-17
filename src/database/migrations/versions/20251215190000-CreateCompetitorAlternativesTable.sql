-- 创建 competitor_alternatives 表，用于存储意向竞品的可替代产品

CREATE TABLE IF NOT EXISTS `competitor_alternatives` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `tenant_id`       BIGINT         NOT NULL COMMENT '租户ID',
  `competitor_id`   BIGINT         NOT NULL COMMENT '关联的意向竞品ID',
  `related_type`    VARCHAR(50)    NULL DEFAULT NULL COMMENT '关联类型：customer/opportunity/contract/order',
  `related_id`      BIGINT         NULL DEFAULT NULL COMMENT '关联对象ID',
  `product_id`      BIGINT         NULL DEFAULT NULL COMMENT '本公司产品ID（可选）',
  `product_name`    VARCHAR(255)   NOT NULL COMMENT '本公司可替代产品名称',
  `spec`            VARCHAR(255)   NULL DEFAULT NULL COMMENT '规格型号',
  `unit`            VARCHAR(50)    NULL DEFAULT NULL COMMENT '计量单位',
  `unit_price`      DECIMAL(12,2)  NULL DEFAULT NULL COMMENT '单价（万元）',
  `annual_potential_amount` DECIMAL(14,2) NULL DEFAULT NULL COMMENT '预估年用量/金额（万元）',
  `advantages`      TEXT           NULL COMMENT '相对竞品的优势',
  `disadvantages`   TEXT           NULL COMMENT '可能的短板/风险',
  `strategy`        TEXT           NULL COMMENT '销售/报价策略',
  `notes`           TEXT           NULL COMMENT '备注',
  `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME       NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_competitor_alternatives_tenant` (`tenant_id`),
  KEY `idx_competitor_alternatives_competitor` (`competitor_id`),
  KEY `idx_competitor_alternatives_related` (`related_type`, `related_id`),
  CONSTRAINT `fk_competitor_alternatives_competitor`
    FOREIGN KEY (`competitor_id`) REFERENCES `customer_competitors` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='意向竞品可替代产品';


