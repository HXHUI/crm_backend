-- 扩展 business_investments 表，添加天眼查原始字段
ALTER TABLE `business_investments`
  ADD COLUMN `tianyancha_id` BIGINT NULL COMMENT '天眼查ID' AFTER `investment_amount`,
  ADD COLUMN `reg_status` VARCHAR(255) NULL COMMENT '经营状态' AFTER `tianyancha_id`,
  ADD COLUMN `amount` DECIMAL(20, 2) NULL COMMENT '投资金额数值' AFTER `reg_status`,
  ADD COLUMN `amount_suffix` VARCHAR(50) NULL COMMENT '金额后缀' AFTER `amount`,
  ADD COLUMN `paidin_time` BIGINT NULL COMMENT '实缴时间(时间戳)' AFTER `amount_suffix`,
  ADD COLUMN `establishment_time` BIGINT NULL COMMENT '成立时间(时间戳)' AFTER `paidin_time`,
  ADD COLUMN `establishment_date` DATE NULL COMMENT '成立日期' AFTER `establishment_time`,
  ADD COLUMN `reg_capital` VARCHAR(255) NULL COMMENT '注册资本' AFTER `establishment_date`,
  ADD COLUMN `subscription_time` BIGINT NULL COMMENT '认缴时间(时间戳)' AFTER `reg_capital`,
  ADD COLUMN `subscription_date` DATE NULL COMMENT '认缴日期' AFTER `subscription_time`,
  ADD COLUMN `type` INT NULL COMMENT '类型(1=公司,2=人)' AFTER `subscription_date`,
  ADD COLUMN `percent` VARCHAR(50) NULL COMMENT '持股比例(字符串格式)' AFTER `type`,
  ADD COLUMN `legal_person_name` VARCHAR(255) NULL COMMENT '法定代表人' AFTER `percent`,
  ADD COLUMN `business_scope` TEXT NULL COMMENT '经营范围' AFTER `legal_person_name`,
  ADD COLUMN `org_type` VARCHAR(255) NULL COMMENT '企业类型' AFTER `business_scope`,
  ADD COLUMN `credit_code` VARCHAR(100) NULL COMMENT '统一社会信用代码' AFTER `org_type`,
  ADD COLUMN `alias` VARCHAR(255) NULL COMMENT '别名' AFTER `credit_code`,
  ADD COLUMN `category` VARCHAR(255) NULL COMMENT '行业类别' AFTER `alias`,
  ADD COLUMN `person_type` INT NULL COMMENT '人员类型(1=人,2=公司)' AFTER `category`,
  ADD COLUMN `base` VARCHAR(50) NULL COMMENT '地区代码' AFTER `person_type`;

-- 修改 investment_amount 字段注释，从"万元"改为"元"
ALTER TABLE `business_investments`
  MODIFY COLUMN `investment_amount` DECIMAL(20, 2) NULL COMMENT '投资金额(元)';

