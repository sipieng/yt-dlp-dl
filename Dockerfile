# 多阶段构建 Dockerfile for yt-dlp-dl
# 第一阶段：构建依赖
FROM python:3.13-slim AS builder

# 设置工作目录
WORKDIR /app

# 安装 uv 包管理器
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 复制依赖文件
COPY pyproject.toml uv.lock ./

# 设置国内镜像源（可选，uv 默认会使用）
# ENV UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple/

# 安装依赖到 .venv
RUN uv sync --frozen --no-dev

# 第二阶段：运行环境
FROM python:3.13-slim

# 设置非交互式安装
ENV DEBIAN_FRONTEND=noninteractive

# 安装必要系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 安装Deno (yt-dlp JavaScript运行时)
RUN curl -fsSL https://deno.land/install.sh | sh && \
    mv /root/.deno/bin/deno /usr/local/bin/deno && \
    chown root:root /usr/local/bin/deno && \
    chmod +x /usr/local/bin/deno && \
    rm -rf /root/.deno

# 创建非 root 用户
RUN useradd -m -u 1000 appuser

WORKDIR /app

# 从构建阶段复制 Python 虚拟环境
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv

# 设置 PATH 包含虚拟环境
ENV PATH="/app/.venv/bin:$PATH"

# 复制应用代码
COPY --chown=appuser:appuser . .

# 创建下载目录且确保权限正确
RUN mkdir -p /app/downloads && chown -R appuser:appuser /app/downloads

# 如果你的 run.py 需要执行权限
RUN chmod +x /app/run.py

# 切换到非 root 用户
USER appuser

# 暴露端口（使用环境变量）
ENV PORT=5000
EXPOSE ${PORT}

# 健康检查（使用环境变量）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 启动应用（不使用 debug 模式）
CMD ["python", "run.py"]
