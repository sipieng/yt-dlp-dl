#!/bin/sh
set -e

# 修复 downloads 目录权限（因为卷挂载会覆盖镜像中的权限）
if [ -d "/app/downloads" ]; then
    chown -R appuser:appuser /app/downloads
    chmod -R 775 /app/downloads
fi

# 切换到 appuser 执行命令
exec su -s /bin/sh appuser -c "$*"
