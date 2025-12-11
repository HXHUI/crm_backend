-- 更新商机阶段枚举值
-- 将旧的阶段值映射到新的阶段值

-- 更新商机阶段
UPDATE opportunities 
SET stage = CASE 
  WHEN stage = 'prospecting' THEN 'initial_contact'
  WHEN stage = 'qualification' THEN 'needs_analysis'
  WHEN stage = 'proposal' THEN 'proposal_quote'
  WHEN stage = 'negotiation' THEN 'negotiation_review'
  WHEN stage = 'closed' THEN 'closed_won'
  ELSE stage
END;

-- 更新商机状态
UPDATE opportunities 
SET status = CASE 
  WHEN status = 'qualification' THEN 'initial_contact'
  WHEN status = 'needs_analysis' THEN 'needs_analysis'
  WHEN status = 'value_proposition' THEN 'proposal_quote'
  WHEN status = 'identify_decision_makers' THEN 'proposal_quote'
  WHEN status = 'proposal_price_quote' THEN 'proposal_quote'
  WHEN status = 'negotiation_review' THEN 'negotiation_review'
  WHEN status = 'closed_won' THEN 'closed_won'
  WHEN status = 'closed_lost' THEN 'closed_lost'
  ELSE status
END;