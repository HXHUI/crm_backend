export type LostTypeKey = 'active' | 'passive'

export const LOST_TYPE_OPTIONS: { key: LostTypeKey; label: string }[] = [
  { key: 'active', label: '主动流失（客户主动放弃）' },
  { key: 'passive', label: '被动流失（我们判断不合格）' },
]

export const LOST_TYPE_KEYS = new Set<LostTypeKey>(LOST_TYPE_OPTIONS.map((t) => t.key))

