#!/bin/bash

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在，请复制 .env.example 到 .env 并配置相关参数"
    exit 1
fi

# 检查Node.js版本
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 16 ]; then
    echo "❌ Node.js版本过低，需要16或更高版本"
    exit 1
fi

echo "🚀 启动CRM后端服务..."

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

# 启动应用
echo "✅ 启动应用..."
npm run start:prod
