# CRM Backend API

基于 NestJS + TypeScript + TypeORM + MySQL + Redis 构建的CRM后端系统。

## 技术栈

- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: MySQL + TypeORM
- **缓存**: Redis
- **认证**: JWT
- **验证**: class-validator + class-transformer

## 项目结构

```
src/
├── config/                 # 配置文件
│   ├── database.config.ts  # 数据库配置
│   └── redis.config.ts     # Redis配置
├── entities/               # 数据库实体
│   ├── base.entity.ts      # 基础实体
│   ├── user.entity.ts      # 用户实体
│   ├── tenant.entity.ts    # 租户实体
│   ├── member.entity.ts    # 成员实体
│   ├── customer.entity.ts  # 客户实体
│   ├── contact.entity.ts   # 联系人实体
│   ├── opportunity.entity.ts # 商机实体
│   ├── activity.entity.ts  # 活动实体
│   └── ...                 # 其他实体
├── common/                 # 通用模块
│   ├── decorators/         # 装饰器
│   ├── guards/             # 守卫
│   └── redis/              # Redis服务
├── modules/                # 业务模块
│   ├── auth/               # 认证模块
│   ├── customers/          # 客户模块
│   ├── opportunities/      # 商机模块
│   └── activities/         # 活动模块
├── app.module.ts           # 应用主模块
└── main.ts                 # 应用入口
```

## 数据模型

### 核心关系图

```
用户 (user)
    │
    ├── 属于多个租户 → 成员 (member) ← 属于 → 租户 (tenant)
    │           │              │                   │
    │           │              ├── 属于多个部门 → 成员-部门 (member_department) ← 属于 → 部门 (department)
    │           │              │
    │           │              └── 拥有多个角色 → 成员-角色 (member_role) ← 属于 → 角色 (role)
    │           │                                                     │
    │           │                                                     └── 拥有多个权限 → 角色-权限 (role_permission) ← 属于 → 权限 (permission)
    │           │
    │           └── 创建/拥有 → 客户 (customer) ← 拥有 → 联系人 (contact)
    │                           │
    │                           ├── 关联 → 商机 (opportunity)
    │                           │
    │                           └── 关联 → 活动 (activity)
    │
    └── 创建 → 租户 (tenant) → 订阅 → 租户订阅 (tenant_subscription) ← 基于 → 套餐 (subscription_plan)
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：
- 数据库连接信息
- Redis连接信息
- JWT密钥
- 应用端口

### 3. 数据库设置

确保MySQL数据库已启动，并创建对应的数据库：

```sql
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 运行应用

开发模式：
```bash
npm run start:dev
```

生产模式：
```bash
npm run build
npm run start:prod
```

## API 文档

### 认证相关

- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/logout` - 用户退出
- `POST /api/v1/auth/refresh` - 刷新Token
- `POST /api/v1/auth/tenant` - 创建租户
- `GET /api/v1/auth/profile` - 获取用户信息
- `PATCH /api/v1/auth/password` - 修改密码

### 客户管理

- `POST /api/v1/customers` - 创建客户
- `GET /api/v1/customers` - 获取客户列表
- `GET /api/v1/customers/:id` - 获取客户详情
- `PATCH /api/v1/customers/:id` - 更新客户信息
- `DELETE /api/v1/customers/:id` - 删除客户
- `GET /api/v1/customers/stats` - 获取客户统计
- `POST /api/v1/customers/:customerId/contacts` - 创建联系人
- `PATCH /api/v1/customers/contacts/:contactId` - 更新联系人
- `DELETE /api/v1/customers/contacts/:contactId` - 删除联系人

### 商机管理

- `POST /api/v1/opportunities` - 创建商机
- `GET /api/v1/opportunities` - 获取商机列表
- `GET /api/v1/opportunities/:id` - 获取商机详情
- `PATCH /api/v1/opportunities/:id` - 更新商机信息
- `DELETE /api/v1/opportunities/:id` - 删除商机
- `GET /api/v1/opportunities/stats` - 获取商机统计
- `PATCH /api/v1/opportunities/:id/stage` - 更新商机阶段
- `PATCH /api/v1/opportunities/:id/close` - 关闭商机

### 活动管理

- `POST /api/v1/activities` - 创建活动
- `GET /api/v1/activities` - 获取活动列表
- `GET /api/v1/activities/:id` - 获取活动详情
- `PATCH /api/v1/activities/:id` - 更新活动信息
- `DELETE /api/v1/activities/:id` - 删除活动
- `GET /api/v1/activities/stats` - 获取活动统计
- `GET /api/v1/activities/upcoming` - 获取即将到来的活动
- `PATCH /api/v1/activities/:id/start` - 开始活动
- `PATCH /api/v1/activities/:id/complete` - 完成活动

## 开发命令

```bash
# 开发模式
npm run start:dev

# 构建项目
npm run build

# 生产模式
npm run start:prod

# 代码格式化
npm run format

# 代码检查
npm run lint

# 运行测试
npm run test

# 运行测试（监听模式）
npm run test:watch

# 测试覆盖率
npm run test:cov

# E2E测试
npm run test:e2e
```

## 特性

- ✅ 多租户架构支持
- ✅ JWT认证和授权
- ✅ Redis缓存支持
- ✅ 完整的CRUD操作
- ✅ 数据验证和转换
- ✅ 软删除支持
- ✅ 分页查询
- ✅ 统计功能
- ✅ 活动状态管理
- ✅ 商机阶段管理

## 许可证

ISC
