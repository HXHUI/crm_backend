# 迁移文件创建总结

## 问题解决

✅ **已解决**: 迁移文件时间戳问题

### 问题描述
- 原始迁移文件使用2024年日期 (`20240101000000`)
- 当前实际日期是2025年9月21日
- 需要更新为正确的当前时间戳

### 解决方案

1. **删除旧文件**
   - 删除了 `20240101000000-initial-schema.sql`

2. **创建新的迁移文件**
   - 使用当前时间戳: `20250920195345`
   - 文件名格式: `YYYYMMDDHHMMSS-migration-name.sql`

3. **提供多种创建方式**

## 迁移文件创建方法

### 方法1: 简单脚本（推荐）
```bash
# 不需要数据库连接
npm run migration:create-simple <migration-name>

# 示例
npm run migration:create-simple add-user-table
```

### 方法2: 直接使用Node.js
```bash
# 直接运行脚本
node scripts/create-migration.js <migration-name>

# 示例
node scripts/create-migration.js update-customer-schema
```

### 方法3: CLI工具
```bash
# 需要数据库连接（如果数据库未配置会失败）
npm run migration:create <migration-name>
```

## 当前迁移文件

```
src/database/migrations/versions/
├── 20250920195345-initial-schema.sql           # 初始架构
├── 20250920195353-add-user-profile-fields.sql # 用户资料字段
└── 20250920195413-add-customer-tags.sql       # 客户标签功能
```

## 迁移文件示例

### 基础模板
```sql
-- Migration: migration-name
-- Version: 20250920195413
-- Created: 2025-09-20T19:54:13.000Z

-- 在这里编写您的SQL语句
-- 例如：
-- CREATE TABLE example_table (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 回滚语句（如果需要）
-- DROP TABLE IF EXISTS example_table;
```

### 完整示例（客户标签功能）
```sql
-- Migration: add-customer-tags
-- Version: 20250920195413
-- Created: 2025-09-20T19:54:13.000Z
-- Description: 为客户表添加标签功能

-- 添加客户标签表
CREATE TABLE IF NOT EXISTS customer_tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签名称',
  color VARCHAR(7) DEFAULT '#1890ff' COMMENT '标签颜色',
  description TEXT COMMENT '标签描述',
  tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_name (name),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tenant_tag_name (tenant_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 回滚语句
-- DROP TABLE IF EXISTS customer_tags;
```

## 时间戳格式

- **格式**: `YYYYMMDDHHMMSS`
- **示例**: `20250920195413`
- **说明**: 年月日时分秒，确保迁移文件按时间顺序执行

## 最佳实践

1. **命名规范**
   - 使用描述性的迁移名称
   - 使用小写字母和连字符
   - 示例: `add-user-table`, `update-customer-schema`

2. **SQL编写**
   - 使用 `IF NOT EXISTS` 避免重复创建
   - 添加适当的索引和外键约束
   - 包含回滚语句

3. **版本控制**
   - 所有迁移文件都应提交到Git
   - 不要修改已提交的迁移文件
   - 使用新的迁移文件来修复问题

4. **测试**
   - 在开发环境测试迁移脚本
   - 验证回滚脚本的正确性
   - 确保迁移不影响现有数据

## 总结

现在您可以：

✅ 使用正确的当前时间戳创建迁移文件
✅ 通过多种方式创建迁移文件
✅ 查看完整的迁移文件示例
✅ 遵循最佳实践进行数据库版本管理

迁移文件创建功能已经完全可用，时间戳问题已解决！
