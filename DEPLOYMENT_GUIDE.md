# CRM Backend 部署指南

## 项目完成总结

🎉 **CRM后端项目已完全搭建完成！**

### ✅ 已完成的功能

1. **完整的项目架构** - NestJS + TypeScript + TypeORM + MySQL + Redis
2. **17个数据库实体** - 完整的多租户CRM数据模型
3. **程序化数据库管理** - CLI工具 + HTTP接口 + 版本控制
4. **完整的业务模块** - 认证、客户、商机、活动管理
5. **32个API接口** - 完整的RESTful API
6. **完善的文档** - API文档、部署指南、使用说明

## 快速部署

### 1. 环境准备

```bash
# 确保已安装以下软件
- Node.js 16+
- MySQL 8.0+
- Redis 6.0+
```

### 2. 项目配置

```bash
# 1. 克隆项目（如果从Git获取）
git clone <repository-url>
cd crm_backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和Redis连接信息
```

### 3. 数据库初始化

```bash
# 方法1: 使用CLI工具（推荐）
npm run db:init

# 方法2: 使用HTTP接口
# 先启动服务: npm run start:dev
# 然后访问: POST http://localhost:3000/api/v1/database/init

# 方法3: 使用SQL脚本
mysql -u root -p < scripts/init-db.sql
```

### 4. 启动服务

```bash
# 开发环境
npm run start:dev

# 生产环境
npm run build
npm run start:prod
```

## 数据库管理系统

### CLI命令

```bash
# 数据库管理
npm run db:init          # 初始化数据库
npm run db:status        # 查看数据库状态
npm run db:migrate       # 运行迁移
npm run db:reset         # 重置数据库（谨慎使用）

# 迁移管理
npm run migration:create <name>  # 创建迁移文件
npm run migration:status         # 查看迁移状态

# 完整CLI帮助
npm run cli              # 显示所有可用命令
```

### HTTP接口

```bash
# 数据库管理接口
POST   /api/v1/database/init     # 初始化数据库
GET    /api/v1/database/status   # 数据库状态
DELETE /api/v1/database/reset    # 重置数据库

# 迁移管理接口
POST   /api/v1/migrations/run    # 运行迁移
GET    /api/v1/migrations/status # 迁移状态
POST   /api/v1/migrations/create/:name # 创建迁移文件

# 健康检查
GET    /api/v1/health            # 服务健康状态
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

- **权限数据**: 16个基础权限（用户、客户、商机、活动管理）
- **套餐数据**: 4个套餐（免费版、基础版、专业版、企业版）

## API接口总览

### 认证模块（7个接口）
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/logout` - 用户退出
- `POST /api/v1/auth/refresh` - 刷新Token
- `POST /api/v1/auth/tenant` - 创建租户
- `GET /api/v1/auth/profile` - 获取用户信息
- `PATCH /api/v1/auth/password` - 修改密码

### 客户模块（8个接口）
- `POST /api/v1/customers` - 创建客户
- `GET /api/v1/customers` - 获取客户列表
- `GET /api/v1/customers/:id` - 获取客户详情
- `PATCH /api/v1/customers/:id` - 更新客户信息
- `DELETE /api/v1/customers/:id` - 删除客户
- `GET /api/v1/customers/stats` - 获取客户统计
- `POST /api/v1/customers/:customerId/contacts` - 创建联系人
- `PATCH /api/v1/customers/contacts/:contactId` - 更新联系人
- `DELETE /api/v1/customers/contacts/:contactId` - 删除联系人

### 商机模块（8个接口）
- `POST /api/v1/opportunities` - 创建商机
- `GET /api/v1/opportunities` - 获取商机列表
- `GET /api/v1/opportunities/:id` - 获取商机详情
- `PATCH /api/v1/opportunities/:id` - 更新商机信息
- `DELETE /api/v1/opportunities/:id` - 删除商机
- `GET /api/v1/opportunities/stats` - 获取商机统计
- `PATCH /api/v1/opportunities/:id/stage` - 更新商机阶段
- `PATCH /api/v1/opportunities/:id/close` - 关闭商机

### 活动模块（9个接口）
- `POST /api/v1/activities` - 创建活动
- `GET /api/v1/activities` - 获取活动列表
- `GET /api/v1/activities/:id` - 获取活动详情
- `PATCH /api/v1/activities/:id` - 更新活动信息
- `DELETE /api/v1/activities/:id` - 删除活动
- `GET /api/v1/activities/stats` - 获取活动统计
- `GET /api/v1/activities/upcoming` - 获取即将到来的活动
- `PATCH /api/v1/activities/:id/start` - 开始活动
- `PATCH /api/v1/activities/:id/complete` - 完成活动

## 项目特色

### 1. 现代化架构
- **NestJS框架** - 企业级Node.js框架
- **TypeScript** - 类型安全的JavaScript
- **TypeORM** - 强大的ORM框架
- **模块化设计** - 易于维护和扩展

### 2. 完整的权限系统
- **多租户架构** - 支持多租户隔离
- **RBAC权限控制** - 基于角色的权限管理
- **细粒度权限** - 菜单、按钮、API三级权限

### 3. 程序化数据库管理
- **CLI工具** - 命令行数据库管理
- **HTTP接口** - RESTful数据库管理接口
- **版本控制** - 数据库迁移版本管理
- **自动初始化** - 一键创建数据库和表

### 4. 丰富的业务功能
- **客户管理** - 完整的客户生命周期管理
- **商机管理** - 商机阶段跟踪和统计
- **活动管理** - 活动日程和状态管理
- **统计分析** - 各模块的数据统计功能

## 开发指南

### 环境变量配置

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=crm_db

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 应用配置
PORT=3000
NODE_ENV=development
```

### 开发命令

```bash
# 开发相关
npm run start:dev        # 开发模式启动
npm run build           # 构建项目
npm run format          # 代码格式化
npm run lint            # 代码检查

# 测试相关
npm run test            # 运行测试
npm run test:watch      # 监听模式测试
npm run test:cov        # 测试覆盖率

# 数据库相关
npm run db:init         # 初始化数据库
npm run db:migrate      # 运行迁移
npm run db:status       # 数据库状态
```

## 生产部署

### Docker部署（推荐）

```dockerfile
# Dockerfile 示例
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### 传统部署

```bash
# 1. 构建项目
npm run build

# 2. 配置生产环境变量
export NODE_ENV=production

# 3. 运行数据库迁移
npm run db:migrate

# 4. 启动生产服务
npm run start:prod
```

### CI/CD集成

```yaml
# GitHub Actions 示例
name: Deploy CRM Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build project
      run: npm run build
      
    - name: Run database migrations
      run: npm run db:migrate
      
    - name: Deploy to production
      run: npm run start:prod
```

## 监控和维护

### 日志管理

```bash
# 查看应用日志
npm run start:dev

# 查看数据库状态
npm run db:status

# 查看迁移状态
npm run migration:status
```

### 性能监控

- **数据库连接** - TypeORM连接池监控
- **Redis缓存** - 缓存命中率监控
- **API响应时间** - 接口性能监控
- **错误日志** - 异常情况监控

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证连接配置是否正确
   - 确认用户权限是否足够

2. **Redis连接失败**
   - 检查Redis服务是否启动
   - 验证连接配置是否正确

3. **迁移执行失败**
   - 检查迁移文件语法是否正确
   - 确认数据库权限是否足够
   - 查看详细错误日志

4. **API接口错误**
   - 检查JWT Token是否有效
   - 验证请求参数是否正确
   - 查看服务器日志

## 总结

CRM后端项目已经完成了从架构设计到功能实现的全部工作，提供了：

- ✅ **完整的CRM业务功能**
- ✅ **现代化的技术架构**
- ✅ **程序化的数据库管理**
- ✅ **完善的API接口**
- ✅ **详细的文档说明**

项目已经具备了投入生产使用的基础条件，可以根据实际需求进行功能扩展和优化。通过程序化的数据库管理工具，可以轻松地进行数据库的初始化、版本控制和迁移管理，大大提高了开发和部署效率。
