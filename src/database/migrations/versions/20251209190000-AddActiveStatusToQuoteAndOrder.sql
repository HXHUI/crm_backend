-- Migration: AddActiveStatusToQuoteAndOrder
-- Version: 20251209190000
-- Description: 为报价和订单添加 active（已生效）状态

-- 更新 quotes 表的 status 枚举，添加 active 状态
ALTER TABLE `quotes` 
MODIFY COLUMN `status` ENUM(
  'draft',              -- 草稿
  'pending_approval',   -- 待审批
  'approved',           -- 已审批
  'active',             -- 已生效
  'rejected',           -- 已拒绝
  'sent',               -- 已发送
  'accepted',           -- 已接受
  'expired'             -- 已过期
) NOT NULL DEFAULT 'draft' COMMENT '报价状态';

-- 更新 orders 表的 status 枚举，添加 active 状态
ALTER TABLE `orders` 
MODIFY COLUMN `status` ENUM(
  'draft',              -- 草稿
  'pending_approval',    -- 待审批
  'approved',           -- 已审批
  'active',             -- 已生效
  'rejected',           -- 已拒绝（审批拒绝）
  'pending',            -- 待处理
  'confirmed',          -- 已确认
  'processing',         -- 处理中
  'shipped',           -- 已发货
  'delivered',         -- 已交付
  'completed',         -- 已完成
  'cancelled'          -- 已取消
) NOT NULL DEFAULT 'draft' COMMENT '订单状态';

-- 回滚脚本（如果需要回滚）
-- ALTER TABLE `quotes` 
-- MODIFY COLUMN `status` ENUM('draft','pending_approval','approved','rejected','sent','accepted','expired') NOT NULL DEFAULT 'draft' COMMENT '报价状态';
-- ALTER TABLE `orders` 
-- MODIFY COLUMN `status` ENUM('draft','pending_approval','approved','rejected','pending','confirmed','processing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'draft' COMMENT '订单状态';

