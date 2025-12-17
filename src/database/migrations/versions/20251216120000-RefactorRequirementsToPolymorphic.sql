-- 将 customer_requirements 改为多态关联（支持 customer 和 opportunity）
-- 1. 添加新字段
ALTER TABLE `customer_requirements`
ADD COLUMN `related_type` VARCHAR(50) NULL COMMENT '关联类型：customer/opportunity' AFTER `id`,
ADD COLUMN `related_id` BIGINT NULL COMMENT '关联对象ID（客户ID或商机ID）' AFTER `related_type`;

-- 2. 迁移现有数据：将所有 customer_id 转换为 related_type='customer', related_id=customer_id
UPDATE `customer_requirements`
SET `related_type` = 'customer',
    `related_id` = `customer_id`
WHERE `customer_id` IS NOT NULL;

-- 3. 将新字段设为 NOT NULL
ALTER TABLE `customer_requirements`
MODIFY COLUMN `related_type` VARCHAR(50) NOT NULL COMMENT '关联类型：customer/opportunity',
MODIFY COLUMN `related_id` BIGINT NOT NULL COMMENT '关联对象ID（客户ID或商机ID）';

-- 4. 添加索引
ALTER TABLE `customer_requirements`
ADD INDEX `idx_requirement_related` (`related_type`, `related_id`);

-- 5. 删除 customer_id 字段的外键约束（如果存在）
-- 先查找外键名称
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_requirements'
    AND COLUMN_NAME = 'customer_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

-- 如果找到外键，删除它
SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `customer_requirements` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 删除 customer_id 字段
ALTER TABLE `customer_requirements` DROP COLUMN `customer_id`;

