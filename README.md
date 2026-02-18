# yt-dlp Web UI

**使用 AI 开发。在 Windows 11 下测试通过。**

基于Flask的Web界面，为yt-dlp提供图形化操作界面。支持解析视频格式、选择下载质量、自定义文件名等功能。

## 待办

[ ] 优化：选择一条视频加两条音频，默认得到的结果无论是mp4还是mkv都只有一条视频和一条音频。（优先级：低）

[ ] 优化：自定义选择的音视频流与封装格式不符时（如选择了把 opus 音频封装入 mp4）自动调用 ffmpeg 转码。（优先级：低）

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

8. **YouTube 完整支持**：集成 Deno JavaScript 运行时和 EJS 挑战求解器，支持所有 YouTube 格式

## 系统要求

### 本地运行
* Python 3.13+
* yt-dlp 2026.02.04+
* Flask 3.0+
* Deno 2.6.10+（仅 VPS/云服务器部署的 Docker 需要，会在构建镜像时自动安装）

### Docker 部署
* Docker 20.10+
* Docker Compose 2.0+

## 安装与运行

### 本地运行

#### 1. 安装依赖

项目使用[UV](https://github.com/astral-sh/uv)管理Python依赖。确保已安装UV，然后运行：

```bash
# 同步依赖（会自动安装Flask和yt-dlp）
uv sync
```

#### 2. 配置端口（可选）

在项目根目录创建 `.env` 文件来自定义端口：

```bash
# .env 文件内容示例
PORT=7105
TZ=Asia/Shanghai
PYTHONUNBUFFERED=1
```

**注意**：默认端口为 5000（未配置时）

#### 3. 启动Web UI

```bash
# 方法1：直接运行批处理文件（Windows，推荐）
run.bat

# 方法2：直接运行Python脚本
uv run run.py
```

#### 4. 访问Web界面

服务器启动后，在浏览器中打开：
👉 **http://127.0.0.1:{PORT}**

其中 `{PORT}` 是你在 `.env` 中配置的端口（默认 5000）

### Docker 部署

```bash
# 创建 .env 文件（可选，自定义配置）
cp .env.example .env

# 使用 Docker Compose 启动
docker compose up -d

# 访问 Web 界面（默认端口 5000，可通过 .env 修改）
# 本地: http://127.0.0.1:{PORT}
# VPS: http://your-vps-ip:{PORT}

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

**如果 VPS 通过 docker 部署后出现无法解析的情况，请参见 [故障排除：VPS 通过 Docker 部署后解析视频报错](#vps-通过-docker-部署后解析视频报错)。

详细说明请参考：[DOCKER.md](DOCKER.md)

## 技术架构

### 项目结构

```
yt-dlp-dl/
├── app.py                    # Flask主应用
├── run.py                    # 启动脚本
├── run.bat                   # Windows启动脚本
├── Dockerfile                # Docker镜像构建文件
├── docker-compose.yml        # Docker Compose配置
├── entrypoint.sh             # Docker入口脚本（修复卷挂载权限）
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

**原因**：旧版本yt-dlp需要JavaScript运行时来解析某些YouTube格式。

**解决方案**：已在 v2.0.2 版本中修复，Docker 镜像自动包含 Deno 2.6.10 和 `yt-dlp-ejs` 组件，无需手动安装。

**本地环境**（如需手动安装）：
```bash
# 安装Deno（推荐）
uv add deno

# 或者使用已有Node.js
uv add nodejs
```

**注意**：即使没有JS运行时，大部分视频仍可正常下载，只是可能缺少某些格式。

### Q2: 文件保存位置

下载的文件默认保存在项目目录下的 `downloads/` 文件夹中。
本地版可在 Web 界面中通过"浏览..."按钮选择其他文件夹，或使用"桌面"快捷按钮快速切换到桌面。
VPS/服务器可直接在服务器项目下的 downloads 目录中访问下载文件。

### Q3: 同时下载多个视频

当前版本暂时设计为**单任务下载**，一次只能处理一个下载任务。

### Q4: 支持哪些视频网站？

支持所有yt-dlp支持的网站，包括：

* YouTube

* Bilibili

* 小红书

* 抖音

* Twitter

* TikTok

* 等1000+个网站

## 故障排除

### Docker 环境问题

**容器无法启动**

```bash
# 查看容器日志
docker logs yt-dlp-dl

# 检查端口是否被占用（将 5000 替换为你的配置端口）
netstat -tulpn | grep {PORT}
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

### 无法解析某些视频

```bash
# 更新yt-dlp到最新版本
uv add yt-dlp -U

# 检查视频URL是否有效
```

### VPS 通过 Docker 部署后解析视频报错

有些网站如 Bilibili 和 YouTube 等为了防止机器人采集，设置了 `n challenge`。通过 Docker 在 VPS 上部署时可能会出现由此产生的视频解析错误。此时需要引入浏览器的 Cookies 以跳过此挑战。方法是：

1) Chrome 浏览器安装 [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) 插件，或者 Firefox 安装 [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) 插件.

2) 打开“无痕窗口”（Chrome）或者“隐私窗口”（Firefox），登录 Bilibili 或者 YouTube 等打开了防护的网站，再用前面安装的浏览器插件仅下载当前网站的 Cookies。

3) 将下载的 Cookies 命名为 `cookies.txt` 并保存在项目根目录。如果是多个网站，可以把 Cookies 拼接在一起（带 `#` 的文件头注释只要开头出现一次）。

## 更新日志

### v2.2.0 (2026-02-18)

* **YouTube JS 挑战求解修复** 🔧
  * 添加 Deno 2.6.10 JavaScript 运行时（Dockerfile）
  * 添加 `unzip` 系统依赖（Deno 安装需要）
  * 配置 `yt-dlp[default]` extra 依赖，包含 `yt-dlp-ejs`
  * 显式添加 `yt-dlp-ejs>=0.4.0` 依赖（本地安装 EJS 脚本）
  * 在 `services/downloader.py` 中启用 `remote_components: ["ejs:github"]`
  * 移除 `uv sync --frozen` 选项，允许更新依赖

* **Docker 卷挂载权限修复** 🐛
  * 新增 `entrypoint.sh` 入口脚本
  * 修复卷挂载后 `downloads` 目录权限问题
  * 容器以 `root` 启动，修复权限后切换到 `appuser` 执行应用

* **Dockerfile 优化** 📦
  * 多阶段构建保持不变
  * Deno 安装到 `/usr/local/bin/deno`，所有用户可访问

* **配置文件更新**
  * `docker-compose.yml`: 使用 `entrypoint.sh` 和 `user: root`

### v2.1.0 (2026-02-18)

* **端口配置修复** 🔧
  * 移除所有硬编码的 5000 端口，改为通过 `PORT` 环境变量统一配置
  * 添加 `python-dotenv` 依赖，自动加载 `.env` 文件
  * 本地和 Docker 环境均支持自定义端口

* **环境检测优化** 🐛
  * 修复 `.env` 中 `IS_DOCKER=true` 导致本地运行时无法自动打开浏览器的问题
  * `run.bat` 自动设置 `IS_DOCKER=false`
  * `docker-compose.yml` 自动设置 `IS_DOCKER=true`

* **Windows 启动脚本修复** 🪟
  * 修复 `run.bat` 乱码问题，改用 ASCII 编码
  * 自动打开浏览器功能恢复正常

* **配置文件更新**
  * `.env.example` 移除 `IS_DOCKER` 配置项
  * Dockerfile 健康检查使用 `${PORT}` 环境变量

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
