import { Injectable } from '@nestjs/common';
import { CustomFieldConfig, CustomFieldType, ValidationRules } from '../../../entities/custom-field-config.entity';

@Injectable()
export class CustomFieldValueValidator {
  /**
   * 验证单个字段值
   */
  validateFieldValue(config: CustomFieldConfig, value: any): { valid: boolean; message?: string } {
    // 必填验证
    if (config.isRequired && (value === null || value === undefined || value === '')) {
      return {
        valid: false,
        message: `${config.fieldName} 是必填项`,
      };
    }

    // 如果值为空且不是必填，直接通过
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }

    const rules = config.validationRules;
    if (!rules) {
      return { valid: true };
    }

    // 根据字段类型进行验证
    switch (config.fieldType) {
      case CustomFieldType.TEXT:
      case CustomFieldType.TEXTAREA:
        return this.validateText(value, config.fieldName, rules);
      case CustomFieldType.NUMBER:
        return this.validateNumber(value, config.fieldName, rules);
      case CustomFieldType.SELECT:
        return this.validateSelect(value, config);
      case CustomFieldType.MULTISELECT:
        return this.validateMultiSelect(value, config);
      case CustomFieldType.BOOLEAN:
        return this.validateBoolean(value, config.fieldName);
      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        return this.validateDate(value, config.fieldName);
      default:
        return { valid: true };
    }
  }

  /**
   * 验证文本类型
   */
  private validateText(value: any, fieldName: string, rules: ValidationRules): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: `${fieldName} 必须是字符串类型` };
    }

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return {
        valid: false,
        message: rules.message || `${fieldName} 长度不能少于 ${rules.minLength} 个字符`,
      };
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return {
        valid: false,
        message: rules.message || `${fieldName} 长度不能超过 ${rules.maxLength} 个字符`,
      };
    }

    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          return {
            valid: false,
            message: rules.message || `${fieldName} 格式不正确`,
          };
        }
      } catch (e) {
        return {
          valid: false,
          message: `${fieldName} 验证规则配置错误`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 验证数字类型
   */
  private validateNumber(value: any, fieldName: string, rules: ValidationRules): { valid: boolean; message?: string } {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return { valid: false, message: `${fieldName} 必须是数字类型` };
    }

    if (rules.min !== undefined && numValue < rules.min) {
      return {
        valid: false,
        message: rules.message || `${fieldName} 不能小于 ${rules.min}`,
      };
    }

    if (rules.max !== undefined && numValue > rules.max) {
      return {
        valid: false,
        message: rules.message || `${fieldName} 不能大于 ${rules.max}`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证选择类型
   */
  private validateSelect(value: any, config: CustomFieldConfig): { valid: boolean; message?: string } {
    if (config.fieldOptions?.sourceType === 'manual' && config.fieldOptions?.options) {
      const validValues = config.fieldOptions.options.map(opt => opt.value);
      if (!validValues.includes(value)) {
        return {
          valid: false,
          message: `${config.fieldName} 的值不在允许的选项中`,
        };
      }
    }
    return { valid: true };
  }

  /**
   * 验证多选类型
   */
  private validateMultiSelect(value: any, config: CustomFieldConfig): { valid: boolean; message?: string } {
    if (!Array.isArray(value)) {
      return { valid: false, message: `${config.fieldName} 必须是数组类型` };
    }

    if (config.fieldOptions?.sourceType === 'manual' && config.fieldOptions?.options) {
      const validValues = config.fieldOptions.options.map(opt => opt.value);
      const invalidValues = value.filter(v => !validValues.includes(v));
      if (invalidValues.length > 0) {
        return {
          valid: false,
          message: `${config.fieldName} 包含无效的选项值: ${invalidValues.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 验证布尔类型
   */
  private validateBoolean(value: any, fieldName: string): { valid: boolean; message?: string } {
    if (typeof value !== 'boolean') {
      return { valid: false, message: `${fieldName} 必须是布尔类型` };
    }
    return { valid: true };
  }

  /**
   * 验证日期类型
   */
  private validateDate(value: any, fieldName: string): { valid: boolean; message?: string } {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, message: `${fieldName} 必须是有效的日期格式` };
      }
    } else if (!(value instanceof Date)) {
      return { valid: false, message: `${fieldName} 必须是日期类型` };
    }
    return { valid: true };
  }
}

