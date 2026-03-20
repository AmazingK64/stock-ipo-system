#!/bin/bash

# 港股IPO数据爬虫后端服务启动脚本

echo "🚀 正在启动港股IPO数据爬虫后端服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 进入后端目录
cd "$(dirname "$0")"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

# 启动服务
echo "📡 启动服务在 http://localhost:3001"
echo "按 Ctrl+C 停止服务"
echo ""

npm start
