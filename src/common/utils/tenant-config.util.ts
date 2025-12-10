import { Tenant } from '../../entities/tenant.entity';

/**
 * 租户配置默认值
 */
export interface TenantConfigDefaults {
  contractExpiryReminderDays: number;
  opportunityCloseReminderDays: number;
  customerPoolAutoReturnDays: number;
}

/**
 * 获取租户配置的默认值
 */
export function getTenantConfigDefaults(): TenantConfigDefaults {
  return {
    contractExpiryReminderDays: 7,
    opportunityCloseReminderDays: 7,
    customerPoolAutoReturnDays: 30,
  };
}

/**
 * 获取租户配置值（如果不存在则返回默认值）
 */
export function getTenantConfig(tenant: Tenant): TenantConfigDefaults {
  const defaults = getTenantConfigDefaults();
  const config = tenant.config || {};

  return {
    contractExpiryReminderDays: config.contractExpiryReminderDays ?? defaults.contractExpiryReminderDays,
    opportunityCloseReminderDays: config.opportunityCloseReminderDays ?? defaults.opportunityCloseReminderDays,
    customerPoolAutoReturnDays: config.customerPoolAutoReturnDays ?? defaults.customerPoolAutoReturnDays,
  };
}

/**
 * 从配置对象获取配置值
 */
export function getConfigFromObject(config: Record<string, any> | null | undefined): TenantConfigDefaults {
  const defaults = getTenantConfigDefaults();
  if (!config) {
    return defaults;
  }

  return {
    contractExpiryReminderDays: config.contractExpiryReminderDays ?? defaults.contractExpiryReminderDays,
    opportunityCloseReminderDays: config.opportunityCloseReminderDays ?? defaults.opportunityCloseReminderDays,
    customerPoolAutoReturnDays: config.customerPoolAutoReturnDays ?? defaults.customerPoolAutoReturnDays,
  };
}

