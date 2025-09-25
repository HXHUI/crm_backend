# 数据库管理系统使用指南

## 概述

CRM后端系统提供了完整的数据库管理功能，支持程序化的数据库初始化、版本控制和迁移管理。

## 功能特性

- ✅ **程序化数据库初始化** - 自动创建数据库和表结构
- ✅ **版本控制** - 数据库迁移版本管理
- ✅ **CLI工具** - 命令行数据库管理工具
- ✅ **API接口** - HTTP接口管理数据库
- ✅ **基础数据** - 自动插入权限和套餐数据

## 快速开始

### 1. 首次部署

```bash
# 方法1: 使用CLI工具（推荐）
npm run db:init

# 方法2: 使用HTTP接口
curl -X POST http://localhost:3000/api/v1/database/init

# 方法3: 使用SQL脚本（传统方式）
mysql -u root -p < scripts/init-db.sql
```

### 2. 查看数据库状态

```bash
# 使用CLI工具
npm run db:status

# 使用HTTP接口
curl http://localhost:3000/api/v1/database/status
```

## CLI命令详解

### 数据库管理命令

```bash
# 初始化数据库（创建数据库和表）
npm run db:init

# 查看数据库状态
npm run db:status

# 重置数据库（谨慎使用）
npm run db:reset
```

### 迁移管理命令

```bash
# 运行数据库迁移
npm run db:migrate

# 创建新的迁移文件
npm run migration:create add-user-table

# 查看迁移状态
npm run migration:status
```

### 完整CLI命令列表

```bash
# 显示帮助信息
npm run cli

# 数据库相关
npm run cli init                 # 初始化数据库
npm run cli migrate              # 运行迁移
npm run cli db-status            # 查看数据库状态
npm run cli reset                # 重置数据库

# 迁移相关
npm run cli create-migration     # 创建迁移文件
npm run cli migration-status     # 查看迁移状态
```

## HTTP API接口

### 数据库管理接口

#### POST /api/v1/database/init
初始化数据库

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/v1/database/init
```

**响应示例**:
```json
{
  "success": true,
  "message": "数据库初始化完成",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/v1/database/status
获取数据库状态

**请求示例**:
```bash
curl http://localhost:3000/api/v1/database/status
```

**响应示例**:
```json
{
  "status": "connected",
  "database": "crm_db",
  "tables": [
    {
      "TABLE_NAME": "users",
      "TABLE_ROWS": 0,
      "CREATE_TIME": "2024-01-01T00:00:00.000Z",
      "UPDATE_TIME": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### DELETE /api/v1/database/reset
重置数据库（谨慎使用）

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/api/v1/database/reset
```

### 迁移管理接口

#### POST /api/v1/migrations/run
运行数据库迁移

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/v1/migrations/run
```

#### GET /api/v1/migrations/status
获取迁移状态

**请求示例**:
```bash
curl http://localhost:3000/api/v1/migrations/status
```

**响应示例**:
```json
{
  "total": 5,
  "executed": 3,
  "pending": 2,
  "migrations": [
    {
      "version": "20240101000000",
      "name": "initial-schema",
      "executed": true
    }
  ],
  "lastExecuted": {
    "version": "20240101000000",
    "name": "initial-schema"
  },
  "nextPending": {
    "version": "20240102000000",
    "name": "add-user-table"
  }
}
```

#### POST /api/v1/migrations/create/:name
创建迁移文件

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/v1/migrations/create/add-user-table
```

## 数据库结构

### 核心表（15个）

1. **users** - 用户表
2. **tenants** - 租户表
3. **members** - 成员表
4. **departments** - 部门表
5. **roles** - 角色表
6. **permissions** - 权限表
7. **member_departments** - 成员-部门关联表
8. **member_roles** - 成员-角色关联表
9. **role_permissions** - 角色-权限关联表
10. **customers** - 客户表
11. **contacts** - 联系人表
12. **opportunities** - 商机表
13. **activities** - 活动表
14. **subscription_plans** - 套餐表
15. **tenant_subscriptions** - 租户订阅表

### 基础数据

系统会自动插入以下基础数据：

#### 权限数据（16个）
- 用户管理权限
- 客户管理权限（查看、创建、编辑、删除）
- 商机管理权限（查看、创建、编辑、删除）
- 活动管理权限（查看、创建、编辑、删除）

#### 套餐数据（4个）
- 免费版（个人用户）
- 基础版（小团队）
- 专业版（中型企业）
- 企业版（大型企业）

## 迁移管理

### 创建迁移文件

```bash
# 方法1: 使用CLI工具（需要数据库连接）
npm run migration:create add-user-table

# 方法2: 使用简单脚本（不需要数据库连接，推荐）
npm run migration:create-simple add-user-table

# 方法3: 直接使用Node.js脚本
node scripts/create-migration.js add-user-table

# 生成的文件路径（使用当前时间戳）
# src/database/migrations/versions/20250920195413-add-user-table.sql
```

### 迁移文件模板

```sql
-- Migration: add-user-table
-- Version: 20240101000000
-- Created: 2024-01-01T00:00:00.000Z

-- 在这里编写您的SQL语句
-- 例如：
CREATE TABLE example_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回滚语句（如果需要）
-- DROP TABLE IF EXISTS example_table;
```

### 迁移执行流程

1. **检查迁移表** - 自动创建migrations表
2. **扫描迁移文件** - 读取versions目录下的SQL文件
3. **执行待迁移** - 按版本号顺序执行未执行的迁移
4. **记录执行状态** - 在migrations表中记录执行结果

## 部署流程

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 修改数据库连接信息

# 3. 初始化数据库
npm run db:init

# 4. 启动开发服务器
npm run start:dev
```

### 生产环境

```bash
# 1. 构建项目
npm run build

# 2. 运行迁移（如果有新的迁移）
npm run db:migrate

# 3. 启动生产服务器
npm run start:prod
```

### CI/CD集成

```yaml
# GitHub Actions 示例
- name: Setup Database
  run: |
    npm run db:init
    
- name: Run Migrations
  run: |
    npm run db:migrate
    
- name: Check Database Status
  run: |
    npm run db:status
```

## 注意事项

### 安全考虑

1. **生产环境** - 重置数据库接口仅用于开发环境
2. **权限控制** - 数据库管理接口应设置适当的访问权限
3. **备份策略** - 在执行迁移前建议备份数据库

### 最佳实践

1. **版本控制** - 所有迁移文件都应提交到版本控制系统
2. **测试迁移** - 在开发环境充分测试迁移脚本
3. **回滚准备** - 为重要迁移准备回滚脚本
4. **监控日志** - 关注迁移执行日志和错误信息

### 故障排除

#### 常见问题

1. **连接失败** - 检查数据库连接配置
2. **权限不足** - 确保数据库用户有足够权限
3. **迁移冲突** - 检查迁移文件版本号是否重复
4. **表已存在** - 使用IF NOT EXISTS避免重复创建

#### 日志查看

```bash
# 查看应用日志
npm run start:dev

# 查看数据库连接状态
npm run db:status
```

## 总结

数据库管理系统提供了完整的数据库生命周期管理功能，支持从初始化到版本控制的全部流程。通过CLI工具和HTTP接口，可以方便地进行数据库管理操作，大大提高了开发和部署效率。
