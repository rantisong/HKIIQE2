#!/bin/bash
# 将本地 main 分支推送到 GitHub（需已配置 Git 认证）
set -e
cd "$(dirname "$0")/.."
echo "当前未推送的提交："
git log origin/main..HEAD --oneline
echo ""
echo "正在推送到 origin main ..."
git push origin main
echo "推送完成。"
