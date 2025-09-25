# CRM后端启动脚本 (PowerShell)

# 检查环境变量文件
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env 文件不存在，请复制 .env.example 到 .env 并配置相关参数" -ForegroundColor Red
    exit 1
}

# 检查Node.js版本
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 16) {
    Write-Host "❌ Node.js版本过低，需要16或更高版本" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 启动CRM后端服务..." -ForegroundColor Green

# 安装依赖（如果需要）
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
}

# 构建项目
Write-Host "🔨 构建项目..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

# 启动应用
Write-Host "✅ 启动应用..." -ForegroundColor Green
npm run start:prod
