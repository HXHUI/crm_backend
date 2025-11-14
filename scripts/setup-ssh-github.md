# 配置 SSH 连接 GitHub

## ✅ 已完成的步骤

1. ✅ 已生成 SSH 密钥对
2. ✅ 已切换远程仓库 URL 到 SSH

## 📋 接下来需要做的

### 步骤 1: 复制 SSH 公钥

你的 SSH 公钥已生成，内容如下（请复制完整内容）：

```
（请查看上面的输出）
```

### 步骤 2: 将 SSH 公钥添加到 GitHub

1. 登录 GitHub 网站：https://github.com
2. 点击右上角头像 → **Settings**（设置）
3. 在左侧菜单中找到 **SSH and GPG keys**（SSH 和 GPG 密钥）
4. 点击 **New SSH key**（新建 SSH 密钥）
5. 填写信息：
   - **Title**（标题）：例如 "Windows PC" 或 "开发机器"
   - **Key**（密钥）：粘贴上面复制的完整公钥内容
6. 点击 **Add SSH key**（添加 SSH 密钥）

### 步骤 3: 测试 SSH 连接

在 PowerShell 中运行：

```powershell
ssh -T git@github.com
```

如果看到类似以下消息，说明配置成功：
```
Hi HXHUI! You've successfully authenticated, but GitHub does not provide shell access.
```

### 步骤 4: 测试 Git 操作

```powershell
# 测试拉取
git pull

# 或测试推送（如果有权限）
git push
```

## 🔧 如果遇到问题

### 问题 1: Permission denied (publickey)
- 检查是否已将公钥添加到 GitHub
- 确认公钥内容完整（包括开头的 `ssh-ed25519` 和结尾的邮箱）

### 问题 2: 连接超时
- 检查网络连接
- 尝试使用代理（如果在中国）
- 检查防火墙设置

### 问题 3: 需要切换回 HTTPS
```powershell
git remote set-url origin https://github.com/HXHUI/crm_backend.git
```

## 📝 当前配置

- **远程仓库 URL**: `git@github.com:HXHUI/crm_backend.git`
- **SSH 密钥位置**: `C:\Users\snack\.ssh\id_ed25519`
- **公钥位置**: `C:\Users\snack\.ssh\id_ed25519.pub`

