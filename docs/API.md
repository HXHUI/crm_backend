# CRM Backend API 文档

## 概述

CRM后端API基于NestJS构建，提供完整的客户关系管理功能，包括用户认证、客户管理、商机管理和活动管理。

## 基础信息

- **基础URL**: `http://localhost:3000/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 认证

所有需要认证的接口都需要在请求头中携带JWT Token：

```
Authorization: Bearer <your-jwt-token>
```

## API接口

### 健康检查

#### GET /health
检查服务健康状态

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "CRM Backend API",
  "version": "1.0.0"
}
```

### 认证相关

#### POST /auth/login
用户登录

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "tenantSlug": "string" // 可选，指定租户
}
```

**响应示例**:
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "realName": "string"
  }
}
```

#### POST /auth/register
用户注册

**请求体**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "realName": "string", // 可选
  "phone": "string" // 可选
}
```

#### POST /auth/logout
用户退出

#### POST /auth/refresh
刷新Token

#### POST /auth/tenant
创建租户

**请求体**:
```json
{
  "name": "string",
  "slug": "string",
  "description": "string" // 可选
}
```

#### GET /auth/profile
获取用户信息

#### PATCH /auth/password
修改密码

**请求体**:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

### 客户管理

#### POST /customers
创建客户

**请求体**:
```json
{
  "name": "string",
  "code": "string", // 可选
  "type": "individual" | "company",
  "status": "lead", // 可选
  "companyName": "string", // 可选
  "industry": "string", // 可选
  "size": "string", // 可选
  "description": "string", // 可选
  "tags": ["string"], // 可选
  "estimatedValue": 0, // 可选
  "source": "string", // 可选
  "level": "string" // 可选
}
```

#### GET /customers
获取客户列表

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)

#### GET /customers/:id
获取客户详情

#### PATCH /customers/:id
更新客户信息

#### DELETE /customers/:id
删除客户

#### GET /customers/stats
获取客户统计

**响应示例**:
```json
{
  "totalCustomers": 100,
  "statusStats": [
    {"status": "lead", "count": "50"},
    {"status": "qualified", "count": "30"}
  ],
  "typeStats": [
    {"type": "individual", "count": "60"},
    {"type": "company", "count": "40"}
  ]
}
```

### 联系人管理

#### POST /customers/:customerId/contacts
创建联系人

**请求体**:
```json
{
  "name": "string",
  "position": "string", // 可选
  "department": "string", // 可选
  "email": "string", // 可选
  "phone": "string", // 可选
  "telephone": "string", // 可选
  "type": "primary" | "secondary" | "decision_maker" | "influencer" | "user",
  "isPrimary": false, // 可选
  "notes": "string", // 可选
  "otherContacts": {} // 可选
}
```

#### PATCH /customers/contacts/:contactId
更新联系人

#### DELETE /customers/contacts/:contactId
删除联系人

### 商机管理

#### POST /opportunities
创建商机

**请求体**:
```json
{
  "name": "string",
  "description": "string", // 可选
  "status": "qualification", // 可选
  "stage": "prospecting", // 可选
  "amount": 0,
  "probability": 0, // 可选
  "expectedCloseDate": "2024-01-01T00:00:00.000Z", // 可选
  "source": "string", // 可选
  "competitor": "string", // 可选
  "tags": ["string"], // 可选
  "notes": {}, // 可选
  "customerId": "uuid"
}
```

#### GET /opportunities
获取商机列表

#### GET /opportunities/:id
获取商机详情

#### PATCH /opportunities/:id
更新商机信息

#### DELETE /opportunities/:id
删除商机

#### GET /opportunities/stats
获取商机统计

#### PATCH /opportunities/:id/stage
更新商机阶段

**请求体**:
```json
{
  "stage": "prospecting" | "qualification" | "proposal" | "negotiation" | "closed"
}
```

#### PATCH /opportunities/:id/close
关闭商机

**请求体**:
```json
{
  "status": "closed_won" | "closed_lost"
}
```

### 活动管理

#### POST /activities
创建活动

**请求体**:
```json
{
  "title": "string",
  "description": "string", // 可选
  "type": "call" | "email" | "meeting" | "task" | "note" | "demo" | "presentation" | "follow_up",
  "plannedStartTime": "2024-01-01T00:00:00.000Z",
  "plannedEndTime": "2024-01-01T01:00:00.000Z",
  "location": "string", // 可选
  "outcome": "string", // 可选
  "attachments": ["string"], // 可选
  "participants": ["string"], // 可选
  "customerId": "uuid",
  "opportunityId": "uuid" // 可选
}
```

#### GET /activities
获取活动列表

#### GET /activities/:id
获取活动详情

#### PATCH /activities/:id
更新活动信息

#### DELETE /activities/:id
删除活动

#### GET /activities/stats
获取活动统计

#### GET /activities/upcoming
获取即将到来的活动

**查询参数**:
- `days`: 天数 (默认: 7)

#### PATCH /activities/:id/start
开始活动

#### PATCH /activities/:id/complete
完成活动

**请求体**:
```json
{
  "outcome": "string"
}
```

## 错误处理

API使用标准的HTTP状态码：

- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误
- `401` - 未授权
- `403` - 禁止访问
- `404` - 资源不存在
- `409` - 冲突
- `500` - 服务器错误

**错误响应格式**:
```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

## 数据模型

### 客户状态 (CustomerStatus)
- `lead` - 潜在客户
- `qualified` - 已确认
- `proposal` - 提案阶段
- `negotiation` - 谈判阶段
- `closed_won` - 成交
- `closed_lost` - 失败

### 客户类型 (CustomerType)
- `individual` - 个人
- `company` - 企业

### 商机状态 (OpportunityStatus)
- `qualification` - 资格确认
- `needs_analysis` - 需求分析
- `value_proposition` - 价值主张
- `identify_decision_makers` - 识别决策者
- `proposal_price_quote` - 提案报价
- `negotiation_review` - 谈判审查
- `closed_won` - 成交
- `closed_lost` - 失败

### 商机阶段 (OpportunityStage)
- `prospecting` - 潜在客户开发
- `qualification` - 资格确认
- `proposal` - 提案
- `negotiation` - 谈判
- `closed` - 已关闭

### 活动类型 (ActivityType)
- `call` - 电话
- `email` - 邮件
- `meeting` - 会议
- `task` - 任务
- `note` - 笔记
- `demo` - 演示
- `presentation` - 演示
- `follow_up` - 跟进

### 活动状态 (ActivityStatus)
- `planned` - 计划中
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消
