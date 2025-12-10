-- Migration: UpdateOrderStatusEnum
-- Version: 20251209180000
-- Description: 更新订单状态枚举，添加审批相关状态

-- 更新 orders 表的 status 枚举，添加审批相关状态
ALTER TABLE `orders` 
MODIFY COLUMN `status` ENUM(
  'draft',              -- 草稿
  'pending_approval',    -- 待审批
  'approved',           -- 已审批
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
-- ALTER TABLE `orders` 
-- MODIFY COLUMN `status` ENUM('pending','confirmed','processing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '订单状态';

