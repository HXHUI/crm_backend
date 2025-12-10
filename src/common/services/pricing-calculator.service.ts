import { Injectable, BadRequestException } from '@nestjs/common';
import type { TenantPricingConfig } from '../../modules/tenant/tenant.service';

export interface PriceItemWithComponents {
  unitPrice: number;
  priceComponents?: Record<string, number>;
}

export interface PriceItemWithTaxInput extends PriceItemWithComponents {
  quantity: number;
  discount?: number;
  taxRate?: number; // 税率(%)，如 13 表示 13%
}

export interface PriceItemWithTaxResult {
  unitPrice: number;
  unitPriceExclTax: number;
  amount: number;
  amountExclTax: number;
  taxAmount: number;
  taxRate: number;
  priceComponents?: Record<string, number>;
}

@Injectable()
export class PricingCalculatorService {
  /**
   * 根据租户价格配置计算单价
   * - 简单模式：直接返回 unitPrice
   * - 复杂模式：根据价格组成项求和，并校验必填项
   */
  async calculateUnitPrice(
    item: PriceItemWithComponents,
    pricingConfig: TenantPricingConfig,
  ): Promise<number> {
    if (pricingConfig.pricingMode === 'simple') {
      return item.unitPrice;
    }

    // 复杂模式：从 priceComponents 计算
    if (!item.priceComponents || Object.keys(item.priceComponents).length === 0) {
      throw new BadRequestException('复杂模式下必须提供价格组成项');
    }

    // 校验必填项
    if (pricingConfig.priceComponents) {
      for (const component of pricingConfig.priceComponents) {
        if (component.required) {
          const value = item.priceComponents[component.key];
          if (value === undefined || value === null) {
            throw new BadRequestException(`价格组成项"${component.label}"为必填项`);
          }
        }
      }
    }

    // 求和得到单价
    const total = Object.values(item.priceComponents).reduce((sum, value) => {
      return sum + (Number(value) || 0);
    }, 0);

    return total;
  }

  /**
   * 计算包含税务信息的明细金额
   * - 在 calculateUnitPrice 的基础上，增加不含税单价、不含税金额和税金
   * - 约定：当前 unitPrice / amount 为“含税价”
   */
  async calculateItemAmounts(
    item: PriceItemWithTaxInput,
    pricingConfig: TenantPricingConfig,
  ): Promise<PriceItemWithTaxResult> {
    // 先根据价格配置计算（含税）单价
    const unitPrice = await this.calculateUnitPrice(
      {
        unitPrice: item.unitPrice,
        priceComponents: item.priceComponents,
      },
      pricingConfig,
    );

    const quantity = Number(item.quantity) || 0;
    const discountRate = (Number(item.discount) || 0) / 100;
    const taxRate = Number(item.taxRate) || 0;
    const taxRateDecimal = taxRate > 0 ? taxRate / 100 : 0;

    // 含税/不含税单价
    const unitPriceExclTax =
      taxRateDecimal > 0 ? Number((unitPrice / (1 + taxRateDecimal)).toFixed(2)) : unitPrice;

    // 含税金额
    const grossAmount = unitPrice * quantity * (1 - discountRate);
    const amount = Number(grossAmount.toFixed(2));

    // 不含税金额
    const netAmount = unitPriceExclTax * quantity * (1 - discountRate);
    const amountExclTax = Number(netAmount.toFixed(2));

    // 税金 = 含税金额 - 不含税金额
    const taxAmount = Number((amount - amountExclTax).toFixed(2));

    return {
      unitPrice,
      unitPriceExclTax,
      amount,
      amountExclTax,
      taxAmount,
      taxRate,
      priceComponents: item.priceComponents,
    };
  }
}


