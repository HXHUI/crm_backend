-- Migration: FixOpportunityEnums
-- Version: 20251006033427
-- Created: 2025-10-06T03:34:27.879Z

-- 修复商机阶段和状态枚举值
-- 基于数据库中实际存在的值进行映射

-- 首先更新阶段值
UPDATE opportunities 
SET stage = CASE 
  WHEN stage = 'prospecting' THEN 'initial_contact'
  WHEN stage = 'qualification' THEN 'needs_analysis'
  WHEN stage = 'proposal' THEN 'proposal_quote'
  WHEN stage = 'negotiation' THEN 'negotiation_review'
  WHEN stage = 'closed_won' THEN 'closed_won'
  WHEN stage = 'closed_lost' THEN 'closed_lost'
  ELSE 'initial_contact'
END;

-- 更新状态值
UPDATE opportunities 
SET status = CASE 
  WHEN status = 'initial_contact' THEN 'active'
  WHEN status = 'needs_analysis' THEN 'active'
  WHEN status = 'proposal_quote' THEN 'waiting_client'
  WHEN status = 'negotiation_review' THEN 'active'
  WHEN status = 'closed_won' THEN 'closed'
  WHEN status = 'closed_lost' THEN 'closed'
  ELSE 'active'
END;

-- 更新阶段枚举类型定义
ALTER TABLE opportunities 
MODIFY COLUMN stage ENUM(
  'initial_contact',
  'needs_analysis', 
  'proposal_quote',
  'negotiation_review',
  'closed_won',
  'closed_lost'
) NOT NULL DEFAULT 'initial_contact' COMMENT '商机阶段';

-- 更新状态枚举类型定义
ALTER TABLE opportunities 
MODIFY COLUMN status ENUM(
  'active', 
  'waiting_client', 
  'on_hold', 
  'at_risk', 
  'closed'
) NOT NULL DEFAULT 'active' COMMENT '商机状态';
