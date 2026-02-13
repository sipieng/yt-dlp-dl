# yt-dlp Web UI

**使用 AI 开发。在 Windows 11 下测试通过。**

基于Flask的Web界面，为yt-dlp提供图形化操作界面。支持解析视频格式、选择下载质量、自定义文件名等功能。

## 待办

[  ] 优化：选择一条视频加两条音频，默认得到的结果无论是mp4还是mkv都只有一条视频和一条音频。（优先级：低）

[  ] 优化：自定义选择的音视频流与封装格式不符时（如选择了把 opus 音频封装入 mp4）自动调用 ffmpeg 转码。（优先级：低）

## 功能特性

1. **URL解析**：输入视频URL，自动获取所有可用格式（视频、音频、字幕）

2. **下载模式**：

   * **默认最佳质量**：自动选择最佳画质和音质（yt-dlp默认逻辑）

   * **自定义选择**：手动选择具体的视频、音频、字幕或合并格式

3. **下载选项**：

   * 自定义文件名（留空使用视频原标题）

   * 选择输出容器格式（MP4/MKV/WebM或自动选择）

   * 下载路径配置（本地支持自定义，Docker 环境为固定路径）

4. **实时进度**：显示下载进度、速度和预计完成时间

5. **文件管理**：
   * 本地：下载完成后打开系统文件管理器
   * Docker：下载完成后显示"⬇️ 保存文件"按钮

6. **智能防覆盖**：重复下载自动重命名，避免覆盖旧文件

7. **Docker 支持**：完整的容器化部署方案，同时适合本地与 VPS/云服务器

## 系统要求

### 本地运行
* Python 3.13+
* yt-dlp 2025.12.8+
* Flask 3.0+

### Docker 部署
* Docker 20.10+
* Docker Compose 2.0+

## 安装与运行

### Docker 部署

```bash
# 创建 .env 文件（可选，自定义配置）
cp .env.example .env

# 使用 Docker Compose 启动
docker compose up -d

# 访问 Web 界面
# 本地: http://127.0.0.1:5000
# VPS: http://your-vps-ip:5000

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

详细说明请参考：[DOCKER.md](DOCKER.md)

### 本地运行

#### 1. 安装依赖

项目使用[UV](https://github.com/astral-sh/uv)管理Python依赖。确保已安装UV，然后运行：

```bash
# 同步依赖（会自动安装Flask和yt-dlp）
uv sync
```

#### 2. 启动Web UI

```bash
# 创建 .env 文件（可选，自定义端口）
echo "PORT=5000" > .env

# 方法1：直接运行批处理文件（Windows）
run.bat

# 方法2：直接运行Python脚本
uv run run.py
```

### 3. 访问Web界面

服务器启动后，在浏览器中打开：
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

## 技术架构

### 项目结构

```
yt-dlp-dl/
├── app.py                    # Flask主应用
├── run.py                    # 启动脚本
├── run.bat                   # Windows启动脚本
├── Dockerfile                # Docker镜像构建文件
├── docker-compose.yml        # Docker Compose配置
├── .dockerignore             # Docker构建忽略文件
├── .env.example             # 环境变量配置示例
├── DOCKER.md                # Docker部署文档
├── services/
│   └── downloader.py         # yt-dlp下载器服务
├── templates/
│   └── index.html           # 主界面模板
├── static/
│   ├── css/
│   │   └── style.css        # 样式表
│   └── js/
│       └── script.js        # 前端交互逻辑
├── downloads/               # 下载文件存储目录
├── .gitignore              # Git忽略规则
├── pyproject.toml          # 项目配置
├── uv.lock                 # 依赖锁定
└── README.md               # 本文档
```

### 后端API端点

| 端点                      | 方法   | 功能                |
| ----------------------- | ---- | ----------------- |
| `/`                     | GET  | 渲染主页面             |
| `/api/parse`            | POST | 解析URL，返回视频信息和格式列表 |
| `/api/download`         | POST | 启动下载任务            |
| `/api/status/<task_id>` | GET  | 查询下载任务状态          |
| `/api/open-folder`      | POST | 打开下载文件夹（支持自定义路径）  |
| `/api/select-folder`    | POST | 打开系统文件夹选择对话框      |
| `/api/quick-folder`     | POST | 获取常用文件夹路径（桌面、下载等） |
| `/downloads/<filename>` | GET  | 下载已完成的文件          |
| `/health`               | GET  | 健康检查              |

### 前端技术

* **HTML5**：页面结构

* **CSS3**：响应式设计，现代化界面

* **JavaScript (ES6)**：异步交互，实时更新

* **无框架依赖**：原生实现，轻量高效

## 常见问题

### Q1: 解析视频时显示JavaScript运行时警告

```
WARNING: [youtube] No supported JavaScript runtime could be found...
```

**原因**：yt-dlp需要JavaScript运行时来解析某些YouTube格式。
**解决方案**：安装一个JS运行时（如Deno）：

```bash
# 安装Deno（推荐）
uv add deno

# 或者使用已有Node.js
uv add nodejs
```

**注意**：即使没有JS运行时，大部分视频仍可正常下载，只是可能缺少某些格式。

### Q2: 文件保存位置

下载的文件默认保存在项目目录下的 `downloads/` 文件夹中。
可在Web界面中通过"浏览..."按钮选择其他文件夹，或使用"桌面"快捷按钮快速切换到桌面。
也可直接在服务器文件系统中访问下载目录。

### Q3: 同时下载多个视频

当前版本设计为**单任务下载**，一次只能处理一个下载任务。
这是为了防止服务器资源过载。下载完成后可开始新任务。

### Q4: 支持哪些视频网站？

支持所有yt-dlp支持的网站，包括：

* YouTube

* Bilibili

* 小红书

* 抖音

* Twitter

* TikTok

* 等1000+个网站

### Q5: Docker 环境如何访问下载的文件？

**方式一：通过 Web 界面下载**
1. 下载完成后，点击"⬇️ 保存文件"按钮
2. 或右键选择"另存为"保存文件

**方式二：通过卷挂载访问**
```bash
# 查看下载的文件
ls -la ./downloads
```

### Q6: 如何修改 Docker 部署的端口？

在项目根目录创建 `.env` 文件：

```bash
# .env
PORT=8080
```

然后重启容器：

```bash
docker compose down
docker compose up -d
```

## 注意事项

1. **版权提醒**：请仅下载您有权下载的视频内容，遵守相关法律法规。

2. **资源使用**：视频下载会占用网络带宽和服务器存储空间。

3. **文件保留**：下载的文件永久保留在下载目录中，请定期清理。

4. **单任务限制**：同时只允许一个下载任务，避免服务器过载。

5. **Docker 卷挂载**：部署到 VPS 时，建议将下载目录挂载到大容量磁盘。

6. **端口安全**：生产环境建议使用反向代理（如 Nginx）+ HTTPS。

## 故障排除

### Docker 环境问题

**容器无法启动**

```bash
# 查看容器日志
docker logs yt-dlp-dl

# 检查端口是否被占用
netstat -tulpn | grep 5000
```

**无法访问 Web 界面**

```bash
# 检查容器是否运行
docker ps

# 检查端口映射是否正确
docker port yt-dlp-dl

# 检查防火墙是否开放端口
sudo ufw status
```

**更新镜像**

```bash
# 停止并删除旧容器
docker compose down

# 重新构建镜像
docker compose build --no-cache

# 启动新容器
docker compose up -d
```

### 本地环境问题

### 无法启动Flask服务器

```bash
# 检查Python版本
python --version

# 检查依赖是否安装
uv pip list | grep -E "(flask|yt-dlp)"

# 检查端口占用
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # macOS/Linux
```

### 无法解析某些视频

```bash
# 更新yt-dlp到最新版本
uv add yt-dlp -U

# 检查视频URL是否有效
```

### 下载进度不更新

* 刷新页面重新连接

* 检查浏览器控制台是否有JavaScript错误

* 重启Flask服务器

## 更新日志

### v2.0.0 (2026-02-13)

* **Docker 容器化支持** 🎉
  * 添加完整的 Docker 部署方案
  * 多阶段构建优化镜像体积
  * 添加健康检查配置

* **环境区分**
  * 自动检测运行环境（本地/Docker）
  * 本地和 Docker 环境下不同的用户体验

* **Docker 环境优化**
  * 镜像名称：`yt-dlp-web-ui:latest`
  * 隐藏"浏览"和"桌面"按钮
  * 下载完成后显示"⬇️ 保存文件"按钮
  * 下载链接持久显示直到新下载开始
  * 不显示"下载完成！"消息和"打开下载文件夹"按钮

* **端口配置**
  * 通过 `.env` 文件统一配置端口
  * 本地和 Docker 环境均支持

* **配置文件**
  * 新增 `.env.example` 环境变量配置示例
  * 新增 `DOCKER.md` Docker 部署文档

* **前端优化**
  * 下载链接按钮文字改为"保存文件"
  * 根据环境自动隐藏/显示相关 UI 元素

### v1.2.0 (2025-02-05)

* **自定义下载路径**

  * 支持通过"浏览..."按钮选择任意文件夹作为下载目录

  * 添加"桌面"快捷按钮，一键切换到桌面文件夹

  * 默认仍为项目目录下的 `downloads/` 文件夹

  * 下载完成后"打开下载文件夹"按钮会正确打开用户选择的路径

* **新增API端点**

  * `/api/select-folder` - 打开系统文件夹选择对话框（支持Windows/macOS/Linux）

  * `/api/quick-folder` - 获取常用文件夹路径（桌面、下载等）

### v1.1.0 (2025-02-04)

* **支持合并音视频流的平台（如小红书）**

  * 统一表格显示所有格式类型（视频/音频/合并/字幕）

  * 添加 `format_type` 字段和 `has_separate_streams` 标志

  * 支持多选格式，用户可自由选择任意组合

  * 移除标签页切换，简化用户操作

* **防止文件覆盖 - 自动重命名**

  * 重复下载同一链接时自动添加数字后缀（如 `_2`, `_3`）

  * 支持自定义文件名和默认文件名两种情况

* **"打开下载文件夹"功能**

  * 将"下载文件"按钮改为"打开下载文件夹"

  * 支持 Windows/macOS/Linux 系统

  * 使用非阻塞方式打开文件夹

* **优化加载提示位置**

  * 将"正在解析视频信息"提示移到"1. 输入视频URL"模块下方

  * 用户无需滚动页面即可查看解析状态

* **Bug修复**

  * 修复格式计数显示错误（显示"0 个可用格式"）

  * 修复重复下载失败问题（不刷新页面直接解析新URL）

  * 修复双重"下载失败"提示问题

* **错误提示优化**

  * 错误消息位置优化：移到"1. 输入视频URL"模块下方

  * 错误消息持久显示：移除自动隐藏，一直保留直到用户操作

  * 修复错误消息不显示bug

* **解析结果清空逻辑**

  * 新解析前自动清空旧结果，避免误导用户

  * 清空按钮智能显示：根据URL输入框内容自动显示/隐藏

* **默认设置调整**

  * 默认选中"自定义选择"模式

  * 解析成功后自动显示格式列表

* **界面优化**

  * "类型"列宽度调整：从80px增加到100px

  * 时长格式优化：从 `M:SS` 改为 `HH:MM:SS.xxx` 格式

### v1.0.0 (2025-02-02)

* 初始版本发布

* 基本视频解析和下载功能

* 默认/自定义下载模式

* 实时进度显示

* 响应式Web界面

## 许可证

本项目基于MIT许可证开源。详见LICENSE文件。
