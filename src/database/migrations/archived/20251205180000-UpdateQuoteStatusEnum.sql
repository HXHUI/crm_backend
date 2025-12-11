-- Migration: UpdateQuoteStatusEnum
-- Version: 20251205180000
-- Description: 更新报价和合同状态枚举，添加审批相关状态

-- 更新 quotes 表的 status 枚举，添加 pending_approval 和 approved 状态
ALTER TABLE `quotes` 
MODIFY COLUMN `status` ENUM(
  'draft',              -- 草稿
  'pending_approval',   -- 待审批
  'approved',           -- 已审批
  'rejected',           -- 已拒绝
  'sent',               -- 已发送
  'accepted',           -- 已接受
  'expired'             -- 已过期
) NOT NULL DEFAULT 'draft' COMMENT '报价状态';

-- 更新 contracts 表的 status 枚举，添加 pending_approval 和 approved 状态
ALTER TABLE `contracts` 
MODIFY COLUMN `status` ENUM(
  'draft',              -- 草稿
  'pending_approval',   -- 待审批
  'approved',           -- 已审批
  'rejected',           -- 已拒绝
  'pending_sign',      -- 待签署
  'signed',            -- 已签署
  'active',            -- 已生效
  'expired',           -- 已到期
  'terminated'         -- 已终止
) NOT NULL DEFAULT 'draft' COMMENT '合同状态';

-- 回滚脚本（如果需要回滚）
-- ALTER TABLE `quotes` 
-- MODIFY COLUMN `status` ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft' COMMENT '报价状态';
-- ALTER TABLE `contracts` 
-- MODIFY COLUMN `status` ENUM('draft','pending_sign','signed','active','expired','terminated') NOT NULL DEFAULT 'draft' COMMENT '合同状态';

