-- Migration: UpdateVisitsTableFields
-- Version: 20251118120000
-- Description: 更新拜访表字段：移除标题和GPS相关字段，添加地区和详情地址，修改拜访目的为枚举

-- 1. 移除 title 字段（如果存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'title');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN title;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 移除 location 字段（如果存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'location');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN location;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 移除 GPS 相关字段（如果存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'latitude');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN latitude;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'longitude');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN longitude;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'check_in_latitude');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN check_in_latitude;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'check_in_longitude');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN check_in_longitude;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'check_in_distance');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits DROP COLUMN check_in_distance;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 修改 purpose 字段为枚举类型
-- 首先清理不符合枚举值的数据（将不符合的值设为 NULL）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'purpose');

SET @sql = IF(@col_exists > 0, 
  'UPDATE visits SET purpose = NULL 
   WHERE purpose IS NOT NULL 
   AND purpose NOT IN (
     ''understand_needs'',
     ''monthly_performance'',
     ''performance_increment'',
     ''product_promotion'',
     ''holiday_visit'',
     ''contract_signing'',
     ''sign_statement'',
     ''price_policy'',
     ''after_sales_service'',
     ''negotiate_cooperation'',
     ''understand_business'',
     ''sample_tracking''
   );',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 然后修改字段类型为枚举
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'purpose');

SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE visits MODIFY COLUMN purpose ENUM(
    ''understand_needs'',
    ''monthly_performance'',
    ''performance_increment'',
    ''product_promotion'',
    ''holiday_visit'',
    ''contract_signing'',
    ''sign_statement'',
    ''price_policy'',
    ''after_sales_service'',
    ''negotiate_cooperation'',
    ''understand_business'',
    ''sample_tracking''
  ) NULL COMMENT ''拜访目的'';',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. 添加 region 字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'region');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE visits ADD COLUMN region JSON NULL COMMENT ''所在地区（省市区）'' AFTER check_in_time;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 添加 detail_address 字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'visits' 
  AND column_name = 'detail_address');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE visits ADD COLUMN detail_address VARCHAR(500) NULL COMMENT ''详情地址'' AFTER region;',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回滚语句（如果需要回滚，需要手动恢复字段）
-- ALTER TABLE visits ADD COLUMN title VARCHAR(255) NOT NULL COMMENT '拜访标题' AFTER id;
-- ALTER TABLE visits ADD COLUMN location VARCHAR(500) NULL COMMENT '拜访地点（地址）' AFTER check_in_time;
-- ALTER TABLE visits ADD COLUMN latitude DECIMAL(10, 7) NULL COMMENT '计划地点纬度' AFTER location;
-- ALTER TABLE visits ADD COLUMN longitude DECIMAL(10, 7) NULL COMMENT '计划地点经度' AFTER latitude;
-- ALTER TABLE visits ADD COLUMN check_in_latitude DECIMAL(10, 7) NULL COMMENT '签到地点纬度' AFTER longitude;
-- ALTER TABLE visits ADD COLUMN check_in_longitude DECIMAL(10, 7) NULL COMMENT '签到地点经度' AFTER check_in_latitude;
-- ALTER TABLE visits ADD COLUMN check_in_distance DECIMAL(10, 2) NULL COMMENT '签到距离偏差（米）' AFTER check_in_longitude;
-- ALTER TABLE visits MODIFY COLUMN purpose VARCHAR(500) NULL COMMENT '拜访目的';
-- ALTER TABLE visits DROP COLUMN region;
-- ALTER TABLE visits DROP COLUMN detail_address;

