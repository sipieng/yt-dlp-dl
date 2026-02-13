# Docker 部署指南

本项目支持 Docker 容器化部署，可在 VPS 或任何支持 Docker 的环境中运行。

---

## 功能说明

### 本地环境 vs Docker 环境

| 功能 | 本地环境 | Docker 环境 |
|------|----------|-------------|
| Web UI | ✅ 完整支持 | ✅ 完整支持 |
| 视频下载 | ✅ 完整支持 | ✅ 完整支持 |
| 打开文件夹 | ✅ 系统文件管理器 | ✅ 显示下载文件列表（可下载） |
| 选择下载路径 | ✅ 浏览选择 | ⚠️ 固定路径（/app/downloads） |
| 快捷路径（桌面/下载） | ✅ 系统标准路径 | ⚠️ 固定路径（/app/downloads） |
| 自动打开浏览器 | ✅ 自动打开 | ⚠️ 跳过（远程访问） |

---

## 快速开始

### 方式一：使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 方式二：使用 Docker 命令

```bash
# 构建镜像
docker build -t yt-dlp-dl .

# 运行容器
docker run -d \
  --name yt-dlp-dl \
  -p 5000:5000 \
  -v $(pwd)/downloads:/app/downloads \
  -e IS_DOCKER=true \
  --restart unless-stopped \
  yt-dlp-dl

# 查看日志
docker logs -f yt-dlp-dl

# 停止并删除容器
docker stop yt-dlp-dl && docker rm yt-dlp-dl
```

---

## 配置说明

### docker-compose.yml 配置

```yaml
services:
  yt-dlp-web:
    build: .
    container_name: yt-dlp-dl
    ports:
      - "5000:5000"          # 端口映射（主机:容器）
    volumes:
      - ./downloads:/app/downloads  # 下载目录挂载
    environment:
      - IS_DOCKER=true               # Docker 环境标识
      - TZ=Asia/Shanghai           # 时区设置
      - PYTHONUNBUFFERED=1
    restart: unless-stopped         # 自动重启策略
```

### 自定义配置

#### 修改端口

```yaml
ports:
  - "8080:5000"  # 主机端口 8080 映射到容器 5000
```

#### 修改下载目录

```yaml
volumes:
  - /path/to/your/downloads:/app/downloads  # 使用宿主机绝对路径
```

#### 修改时区

```yaml
environment:
  - TZ=America/New_York  # 纽约时区
  # 或
  - TZ=UTC               # UTC 时间
```

---

## 访问服务

部署完成后，在浏览器中访问：

- **本地**: http://127.0.0.1:5000
- **VPS**: http://your-vps-ip:5000

### 使用 Nginx 反向代理（推荐用于生产环境）

在 Nginx 配置文件中添加：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Docker 环境下的使用说明

### 下载文件

Docker 环境下，下载的文件存储在挂载的卷中：

- 默认位置：`./downloads`（项目目录下）
- 自定义位置：根据 `docker-compose.yml` 中的卷挂载配置

### 访问下载的文件

**方式一：通过 Web 界面下载**

1. 下载完成后，点击"打开下载文件夹"按钮
2. 弹出的对话框中显示所有下载文件
3. 点击"下载"按钮将文件下载到本地

**方式二：通过卷挂载访问**

如果挂载到宿主机目录，可以直接在宿主机上访问：

```bash
# 查看下载的文件
ls -la ./downloads
```

### 文件夹选择

Docker 环境下：

- "浏览..." 按钮：固定返回 `/app/downloads`
- "桌面"/"下载"快捷按钮：固定返回 `/app/downloads`

---

## 常用 Docker 命令

### 查看容器状态

```bash
docker ps
```

### 查看日志

```bash
# 实时查看日志
docker logs -f yt-dlp-dl

# 查看最近 100 行日志
docker logs --tail 100 yt-dlp-dl
```

### 进入容器

```bash
docker exec -it yt-dlp-dl bash
```

### 重启容器

```bash
docker restart yt-dlp-dl
```

### 更新镜像

```bash
# 停止并删除旧容器
docker compose down

# 重新构建镜像
docker compose build

# 启动新容器
docker compose up -d
```

---

## 故障排除

### 容器无法启动

```bash
# 查看容器日志
docker logs yt-dlp-dl

# 检查端口是否被占用
netstat -tulpn | grep 5000
```

### 无法访问 Web 界面

1. 检查容器是否运行：`docker ps`
2. 检查端口映射是否正确：`docker port yt-dlp-dl`
3. 检查防火墙是否开放端口：`sudo ufw status`
4. 检查 VPS 安全组是否允许访问端口

### 下载文件权限问题

```bash
# 修改下载目录权限
sudo chown -R 1000:1000 ./downloads
```

### 更新 yt-dlp

```bash
# 重新构建镜像（会拉取最新依赖）
docker compose build --no-cache
docker compose up -d
```

---

## 性能优化

### 限制资源使用

在 `docker-compose.yml` 中添加：

```yaml
services:
  yt-dlp-web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 使用更小的基础镜像

当前使用 `python:3.13-slim`，如需更小镜像可使用 Alpine：

```dockerfile
FROM python:3.13-alpine
# ... 需要额外安装依赖
```

---

## 安全建议

1. **使用非 root 用户**：Dockerfile 中已配置使用 `appuser`
2. **限制网络访问**：只在需要时暴露端口
3. **定期更新镜像**：保持基础镜像和依赖最新
4. **使用 HTTPS**：通过 Nginx + Let's Encrypt 配置 SSL
5. **限制容器权限**：避免使用 `--privileged` 模式

---

## 技术支持

如遇到问题，请检查：

1. Docker 和 Docker Compose 版本是否满足要求
2. 宿主机是否有足够的磁盘空间
3. 网络连接是否正常
4. 防火墙和安全组配置是否正确

---

## 本地开发

如需在本地开发，保持原有方式即可：

```bash
# 安装依赖
uv sync

# 启动服务
uv run run.py
```

本地环境不受 Docker 配置影响，所有功能保持原样。
