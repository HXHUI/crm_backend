-- Migration: UpdateOpportunityStatusEnums
-- Version: 20251006031159
-- Created: 2025-10-06T03:11:59.013Z

-- 更新商机状态枚举值
-- 将旧的状态值映射到新的状态值

-- 更新商机状态
UPDATE opportunities 
SET status = CASE 
  WHEN status = 'initial_contact' THEN 'active'
  WHEN status = 'needs_analysis' THEN 'active'
  WHEN status = 'proposal_quote' THEN 'waiting_client'
  WHEN status = 'negotiation_review' THEN 'active'
  WHEN status = 'closed_won' THEN 'closed'
  WHEN status = 'closed_lost' THEN 'closed'
  ELSE 'active'  -- 默认设置为积极跟进
END;

-- 更新枚举类型定义（MySQL）
ALTER TABLE opportunities 
MODIFY COLUMN status ENUM(
  'active', 
  'waiting_client', 
  'on_hold', 
  'at_risk', 
  'closed'
) NOT NULL DEFAULT 'active' COMMENT '商机状态';

-- 回滚语句（如果需要）
-- UPDATE opportunities 
-- SET status = CASE 
--   WHEN status = 'active' THEN 'initial_contact'
--   WHEN status = 'waiting_client' THEN 'proposal_quote'
--   WHEN status = 'on_hold' THEN 'initial_contact'
--   WHEN status = 'at_risk' THEN 'initial_contact'
--   WHEN status = 'closed' THEN 'closed_won'
--   ELSE 'initial_contact'
-- END;
-- 
-- ALTER TABLE opportunities 
-- MODIFY COLUMN status ENUM(
--   'initial_contact',
--   'needs_analysis',
--   'proposal_quote',
--   'negotiation_review',
--   'closed_won',
--   'closed_lost'
-- ) NOT NULL DEFAULT 'initial_contact' COMMENT '商机状态';
