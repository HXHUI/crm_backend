export type UnqualifiedReasonKey =
  | 'budget_insufficient'
  | 'need_mismatch'
  | 'competitor'
  | 'timing'
  | 'no_response'
  | 'price_too_high'
  | 'other'

export const UNQUALIFIED_REASON_OPTIONS: { key: UnqualifiedReasonKey; label: string }[] = [
  { key: 'budget_insufficient', label: '预算不足' },
  { key: 'need_mismatch', label: '需求不匹配' },
  { key: 'competitor', label: '选择竞争对手' },
  { key: 'timing', label: '时机不合适' },
  { key: 'no_response', label: '无响应' },
  { key: 'price_too_high', label: '价格过高' },
  { key: 'other', label: '其他' },
]

export const UNQUALIFIED_REASON_KEYS = new Set<UnqualifiedReasonKey>(
  UNQUALIFIED_REASON_OPTIONS.map((r) => r.key),
)

