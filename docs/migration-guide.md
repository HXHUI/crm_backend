# 数据库迁移指南

## 概述

本项目采用混合迁移策略，结合 TypeORM 迁移和复杂 SQL 迁移，以充分利用两者的优势。

## 迁移类型

### 1. TypeORM 迁移（推荐）
- **适用场景**：简单的表结构变更、列添加/删除、索引操作
- **优点**：类型安全、自动回滚、版本控制
- **文件格式**：`.ts` 文件

### 2. 复杂 SQL 迁移
- **适用场景**：多表操作、复杂数据迁移、存储过程创建
- **优点**：灵活性高、支持复杂 SQL
- **文件格式**：`.sql` 文件

## 使用方法

### TypeORM 迁移

```bash
# 创建迁移
npm run migration:create <migration-name>

# 执行迁移
npm run db:migrate

# 查看迁移状态
npm run migration:status
```

### 复杂 SQL 迁移

```bash
# 列出所有复杂迁移
npm run migration:complex:list

# 执行复杂迁移
npm run migration:complex:execute <migration-name>

# 示例：执行客户标签迁移
npm run migration:complex:execute add-customer-tags
```

## 迁移文件规范

### TypeORM 迁移文件
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1234567890 implements MigrationInterface {
  name = 'MigrationName1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 迁移逻辑
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚逻辑
  }
}
```

### 复杂 SQL 迁移文件
```sql
-- Migration: migration-name
-- Version: 1234567890
-- Created: 2025-01-01T00:00:00.000Z
-- Description: 迁移描述

-- 第一个SQL语句
CREATE TABLE example_table (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- 第二个SQL语句
INSERT INTO example_table (id, name) VALUES 
('1', 'example1'),
('2', 'example2');
```

## 最佳实践

### 1. 迁移文件命名
- TypeORM 迁移：`YYYYMMDDHHMMSS-MigrationName.ts`
- SQL 迁移：`YYYYMMDDHHMMSS-migration-name.sql`

### 2. 迁移内容组织
- 每个迁移只做一件事
- 复杂操作拆分为多个简单迁移
- 包含详细的注释和描述

### 3. 回滚策略
- 每个迁移都要有对应的回滚操作
- 测试回滚操作的正确性
- 数据迁移要考虑回滚的复杂性

### 4. 团队协作
- 迁移文件提交前要测试
- 使用版本控制管理迁移文件
- 生产环境迁移要谨慎

## 故障处理

### 迁移失败
1. 检查 SQL 语法错误
2. 确认数据库连接正常
3. 查看详细错误日志
4. 手动修复后重新执行

### 回滚迁移
```bash
# TypeORM 回滚（需要实现回滚逻辑）
npm run cli migrate:revert

# 复杂迁移回滚（手动执行）
mysql -u root -proot -e "USE crm_db; [回滚SQL语句]"
```

## 工具说明

### MigrationHelper 类
提供复杂迁移的辅助方法：
- `executeComplexMigration()`: 执行多语句 SQL
- `tableExists()`: 检查表是否存在
- `columnExists()`: 检查列是否存在
- `addColumnIfNotExists()`: 安全添加列
- `createTableIfNotExists()`: 安全创建表

### 复杂迁移管理器
- 智能解析 SQL 语句
- 逐个执行 SQL 语句
- 自动标记迁移状态
- 提供详细的执行日志

## 注意事项

1. **备份数据**：重要迁移前务必备份数据
2. **测试环境**：先在测试环境验证迁移
3. **生产环境**：生产环境迁移要在维护窗口进行
4. **监控日志**：关注迁移执行日志，及时处理问题
5. **团队沟通**：重大迁移要提前通知团队
