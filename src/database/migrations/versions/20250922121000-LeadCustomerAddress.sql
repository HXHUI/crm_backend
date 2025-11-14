-- Migration: LeadCustomerAddress
-- Version: 20250922121000
-- Description: 为 leads 和 customers 表添加地址相关字段

-- 注意：如果字段已存在，这些语句会失败，但可以通过迁移服务处理错误
-- 使用存储过程来检查字段是否存在，避免重复添加

-- leads 表添加字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'industry');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN industry VARCHAR(50) NULL COMMENT \'客户行业（字典key）\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'level');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN level VARCHAR(20) NULL COMMENT \'客户等级\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'province');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN province VARCHAR(50) NULL COMMENT \'省份\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'city');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN city VARCHAR(50) NULL COMMENT \'城市\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'district');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN district VARCHAR(50) NULL COMMENT \'区县\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'address_detail');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE leads ADD COLUMN address_detail VARCHAR(200) NULL COMMENT \'详细地址\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customers 表添加字段（如果不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'province');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN province VARCHAR(50) NULL COMMENT \'省份\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'city');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN city VARCHAR(50) NULL COMMENT \'城市\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'district');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN district VARCHAR(50) NULL COMMENT \'区县\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'address_detail');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE customers ADD COLUMN address_detail VARCHAR(200) NULL COMMENT \'详细地址\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 回滚语句（简化：不回滚）

