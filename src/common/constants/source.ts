export type SourceKey =
  | 'promotion'
  | 'search'
  | 'ads'
  | 'referral'
  | 'online_signup'
  | 'online_quote'
  | 'appointment'
  | 'event'
  | 'website'
  | 'social'
  | 'offline_store'
  | 'channel'
  | 'repeat'
  | 'phone'
  | 'email'
  | 'other'

export const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'promotion', label: '促销' },
  { key: 'search', label: '搜索引擎' },
  { key: 'ads', label: '广告' },
  { key: 'referral', label: '转介绍' },
  { key: 'online_signup', label: '线上注册' },
  { key: 'online_quote', label: '线上询价' },
  { key: 'appointment', label: '预约上门' },
  { key: 'event', label: '展会/活动' },
  { key: 'website', label: '官网/自然到访' },
  { key: 'social', label: '社媒/内容营销' },
  { key: 'offline_store', label: '线下到店' },
  { key: 'channel', label: '渠道合作/代理' },
  { key: 'repeat', label: '复购/老客户' },
  { key: 'phone', label: '外呼（电话咨询）' },
  { key: 'email', label: '邮件咨询' },
  { key: 'other', label: '其他' },
]

export const SOURCE_KEYS = new Set<SourceKey>(SOURCE_OPTIONS.map(s => s.key))
