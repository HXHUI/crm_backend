-- 为 customer_profiles 表增加信用评定相关字段

ALTER TABLE `customer_profiles`
  ADD COLUMN `fund_status` VARCHAR(20) NULL DEFAULT NULL COMMENT '资金状况：abundant(充裕)/normal(一般)/tight(紧张)' AFTER `credit_tier`,
  ADD COLUMN `business_years` INT NULL DEFAULT NULL COMMENT '经营年限（年）' AFTER `fund_status`,
  ADD COLUMN `industry_reputation` VARCHAR(20) NULL DEFAULT NULL COMMENT '行业口碑：good(优)/fair(良)/bad(差)' AFTER `business_years`,
  ADD COLUMN `growth_potential` VARCHAR(20) NULL DEFAULT NULL COMMENT '发展潜力：high(大)/medium(中)/low(小)' AFTER `industry_reputation`,
  ADD COLUMN `owner_type` VARCHAR(20) NULL DEFAULT NULL COMMENT '老板类型：aggressive(开拓型)/conservative(保守型)' AFTER `growth_potential`,
  ADD COLUMN `overall_comment` TEXT NULL COMMENT '综评结论' AFTER `owner_type`;


