# 天眼查API配置说明

## 需要配置的环境变量

在 `.env` 或 `.env.local` 文件中添加以下配置：

```env
# 天眼查API配置
TIANYANCHA_API_KEY=你的天眼查API密钥
TIANYANCHA_API_URL=https://open.api.tianyancha.com
```

## 配置步骤

1. **获取天眼查API密钥**
   - 登录天眼查开放平台：https://open.tianyancha.com
   - 在控制台创建应用，获取 API Key（Token）

2. **配置环境变量**
   - 在 `crm_backend` 目录下创建或编辑 `.env.local` 文件
   - 添加上述环境变量

3. **重启后端服务**
   - 配置完成后需要重启后端服务才能生效

## API接口说明

当前代码中使用的天眼查API接口路径：

- **搜索企业**: `GET /services/open/ic/baseinfoV2?keyword={关键词}&pageNum=1&pageSize=10`
- **获取企业详情**: `GET /services/open/ic/baseinfoV2/{企业ID}`
- **主要人员**: `GET /services/open/ic/humanV2/{企业ID}`
- **股东信息**: `GET /services/open/ic/holderV2/{企业ID}`
- **分支机构**: `GET /services/open/ic/branchV2/{企业ID}`
- **对外投资**: `GET /services/open/ic/investV2/{企业ID}`
- **变更记录**: `GET /services/open/ic/changeinfoV2/{企业ID}`

**注意**: 以上接口路径是根据常见的天眼查API格式编写的，如果您的天眼查API接口路径不同，需要修改 `src/modules/tianyancha/tianyancha.service.ts` 中的接口路径。

## 请求头配置

当前代码中，API密钥通过 `Authorization` 请求头传递：

```typescript
headers: {
  'Authorization': this.apiKey,
  'Content-Type': 'application/json',
}
```

如果您的天眼查API需要不同的认证方式（例如使用 `token` 参数或其他方式），需要修改 `tianyancha.service.ts` 中的请求头配置。

## 测试配置

配置完成后，可以通过以下方式测试：

1. **查看后端日志**
   - 如果配置正确，不会出现 "TIANYANCHA_API_KEY is not configured" 警告
   - 如果API调用失败，会显示具体的错误信息

2. **测试接口**
   - 在客户详情页点击"刷新"按钮
   - 查看是否成功获取工商信息

## 常见问题

1. **"天眼查API密钥未配置"错误**
   - 检查 `.env.local` 文件是否存在
   - 检查环境变量名称是否正确：`TIANYANCHA_API_KEY`
   - 确认已重启后端服务

2. **"查询企业信息失败"错误**
   - 检查API密钥是否有效
   - 检查API接口路径是否正确（可能需要根据天眼查官方文档调整）
   - 查看后端日志中的详细错误信息

3. **API返回格式不匹配**
   - 如果天眼查API返回的数据格式与代码中预期的不一致，需要修改 `tianyancha.service.ts` 中的 `transformCompanyDetail` 方法

## 需要提供的信息

如果您需要我帮您调整API接口，请提供：

1. **天眼查API文档链接**或**接口说明**
2. **实际的API接口路径**（如果与代码中的不同）
3. **认证方式**（请求头格式、参数格式等）
4. **API返回数据示例**（JSON格式）

这样我可以根据实际情况调整代码。

