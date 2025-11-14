# 数据库迁移整合说明

## 概述

所有历史迁移已整合到 `init-db.sql` 中。新环境可以直接使用 `init-db.sql` 初始化数据库，无需执行历史迁移。

## 整合的迁移列表

以下迁移已整合到 `init-db.sql` 中：

1. `20250920195345` - initial-schema
2. `20250920195353` - add-user-profile-fields
3. `20250920195413` - add-customer-tags-fixed
4. `20250920200000` - update-user-member-schema
5. `20250921151120` - fix-member-departments-index
6. `20250921160000` - remove-realname-field
7. `20250921170000` - remove-role-code-field
8. `20250921180000` - remove-role-sort-field
9. `20250921190000` - fix-member-departments-table
10. `20250921195000` - add-customer-pool-type
11. `20250921195100` - modify-customer-owner-id
12. `20250921195200` - add-customer-indexes
13. `20250921210000` - modify-opportunity-owner-id-nullable
14. `20250922000000` - AddCustomerTags
15. `20250922010000` - AddCustomerTagsEntities
16. `20250922103000` - AddTenantIdToCoreTables
17. `20250922110000` - CreateLeadsTable
18. `20250922113000` - ModifyLeadsName
19. `20250922120000` - RenameLeadsColumnsToCamel
20. `20250922121000` - LeadCustomerAddress
21. `20250922140000` - ActivityRefactor
22. `20251005160621` - UpdateOpportunityStatus
23. `20251006031159` - UpdateOpportunityStatusEnums
24. `20251006033427` - FixOpportunityEnums
25. `20251007090000` - CreateTargetTable

## 使用方法

### 新环境初始化

对于新环境，直接使用 `init-db.sql` 初始化数据库：

```bash
# 方式1：使用 MySQL 命令行
mysql -u root -p < scripts/init-db.sql

# 方式2：使用 Node.js 脚本
npm run db:setup
```

### 标记历史迁移为已完成

如果使用 `init-db.sql` 初始化数据库后，需要标记所有历史迁移为已完成，以避免迁移服务重复执行：

```bash
# 使用 MySQL 命令行
mysql -u root -p crm_db < scripts/mark-migrations-as-executed.sql
```

或者在应用启动后，迁移服务会自动检测并跳过已执行的迁移。

## 后续迁移

从 `20251007090000` 之后的迁移将作为新的迁移文件执行。迁移服务会：

1. 检查 `migrations` 表中的已执行迁移
2. 只执行未标记为已执行的迁移文件
3. 自动记录新执行的迁移

## 注意事项

1. **生产环境**：如果生产环境已有数据，请勿直接使用 `init-db.sql`，应继续使用迁移系统逐步升级。

2. **开发环境**：如果开发环境可以重置，可以直接使用 `init-db.sql` 重新初始化。

3. **迁移文件保留**：历史迁移文件建议保留在代码库中，作为数据库结构变更的历史记录。

4. **字段命名**：注意 `member_departments` 表使用驼峰命名（`memberId`, `departmentId`），而其他表使用下划线命名。

## 表结构变更摘要

### 用户表 (users)
- 移除 `real_name` 字段
- `email` 改为可选（NULL）
- `phone` 改为必填（NOT NULL）且唯一

### 角色表 (roles)
- 移除 `code` 字段
- 移除 `sort` 字段

### 客户表 (customers)
- 添加 `pool_type` 字段（客户池类型）
- `ownerId` 改为可空，外键改为 `ON DELETE SET NULL`
- 添加 `tenant_id` 字段
- 添加地址字段：`province`, `city`, `district`, `address_detail`

### 联系人表 (contacts)
- 添加 `tenant_id` 字段

### 商机表 (opportunities)
- `ownerId` 改为可空，外键改为 `ON DELETE SET NULL`
- `status` 枚举值更新为：'active', 'waiting_client', 'on_hold', 'at_risk', 'closed'
- `stage` 枚举值更新为：'initial_contact', 'needs_analysis', 'proposal_quote', 'negotiation_review', 'closed_won', 'closed_lost'
- 添加 `tenant_id` 字段

### 活动表 (activities)
- 移除 `customer_id` 和 `opportunity_id` 字段
- 添加 `relatedToType` 和 `relatedToId` 字段（通用关联）
- 添加 `assignedBy`, `priority`, `content` 字段
- 添加 `tenant_id` 字段

### 成员-部门关联表 (member_departments)
- 字段名改为驼峰命名：`memberId`, `departmentId`

### 新增表
- `customer_tags` - 客户标签表
- `customer_tag_relations` - 客户标签关联表
- `leads` - 线索表
- `target` - 目标表

## 版本信息

- 整合日期：2025-11-14
- 最新迁移版本：20251007090000
- 表总数：20 个（包括 migrations 系统表）

