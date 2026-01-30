# yt-dlp UI 项目计划 - 完整文档

## 项目概述
- **目标**：为yt-dlp创建一个Web风格的UI界面
- **框架**：NiceGUI + yt-dlp Python API
- **Python版本**：>= 3.13
- **包管理器**：uv

---

## 目录结构

```
yt-dlp-ui/
├── src/
│   ├── __init__.py
│   ├── app.py                 # NiceGUI主应用（入口）
│   ├── core/
│   │   ├── __init__.py
│   │   ├── downloader.py      # yt-dlp下载逻辑（异步）
│   │   ├── parser.py          # 视频解析逻辑
│   │   └── utils.py           # 工具函数（格式检查、转码判断）
│   ├── ui/
│   │   ├── __init__.py
│   │   ├── components.py      # 可复用UI组件（格式列表、弹窗等）
│   │   └── styles.py          # 样式配置
│   └── models/
│       ├── __init__.py
│       └── video.py           # 视频信息模型
├── config/
│   └── settings.json          # 用户配置文件（自动生成）
├── tests/
├── pyproject.toml
└── README.md
```

---

## pyproject.toml 配置

```toml
[project]
name = "yt-dlp-ui"
version = "0.1.0"
description = "Web UI for yt-dlp video downloader"
requires-python = ">=3.13"
dependencies = [
    "yt-dlp>=2025.12.8",
    "nicegui>=1.5.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

---

## 核心模块详细设计

### 1. src/models/video.py - 视频信息模型

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class FormatInfo:
    format_id: str
    ext: str
    resolution: str
    height: Optional[int]
    width: Optional[int]
    fps: Optional[int]
    tbr: float  # 总比特率 Kbps
    vcodec: str
    acodec: str
    filesize: Optional[int]
    format_note: str
    is_video: bool
    is_audio: bool
    is_subtitle: bool

@dataclass
class VideoInfo:
    id: str
    title: str
    thumbnail: Optional[str]
    duration: int  # 秒
    uploader: Optional[str]
    view_count: Optional[int]
    formats: List[FormatInfo]
    subtitles: Dict[str, List[str]]  # lang -> format_ids
```

### 2. src/core/parser.py - 视频解析逻辑

```python
from yt_dlp import YoutubeDL
from models.video import VideoInfo, FormatInfo

def parse_video(url: str) -> VideoInfo:
    """解析视频URL，返回视频信息"""
    ydl_opts = {'quiet': True, 'no_warnings': True}
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return convert_to_video_info(info)

def convert_to_video_info(info: dict) -> VideoInfo:
    """将yt-dlp返回的info转换为VideoInfo对象"""
    # 实现转换逻辑
    pass

def get_best_video_format(formats: List[FormatInfo]) -> Optional[FormatInfo]:
    """获取最佳视频格式"""
    pass

def get_best_audio_format(formats: List[FormatInfo]) -> Optional[FormatInfo]:
    """获取最佳音频格式"""
    pass

def auto_select_subtitles(subtitles: Dict[str, List[str]]) -> List[str]:
    """智能选择字幕语言"""
    # 优先级：zh-Hans > zh-Hant > en > []
    pass
```

### 3. src/core/utils.py - 工具函数

```python
from models.video import FormatInfo
from typing import List, Optional

def recommend_output_format(
    video: Optional[FormatInfo], 
    audio_list: List[FormatInfo]
) -> str:
    """
    智能推荐输出格式
    - mp4兼容：avc视频 + mp4a音频
    - 否则使用mkv获得最高兼容性
    """
    pass

def check_transcode_needed(
    video: Optional[FormatInfo],
    audio_list: List[FormatInfo],
    container: str
) -> tuple[bool, List[str]]:
    """
    检查是否需要转码
    返回：(是否需要转码, 转码说明列表)
    """
    pass

def build_format_spec(
    video: Optional[FormatInfo],
    audio_list: List[FormatInfo]
) -> str:
    """
    构建yt-dlp格式参数
    例如：'137+140+139' 或 'bestvideo+bestaudio'
    """
    pass
```

### 4. src/core/downloader.py - 下载逻辑

```python
import asyncio
from yt_dlp import YoutubeDL
from typing import Callable, Optional
from models.video import VideoInfo

class Downloader:
    def __init__(self, output_dir: str, filename_template: str):
        self.output_dir = output_dir
        self.filename_template = filename_template
        self._cancel_flag = False
    
    async def download(
        self,
        url: str,
        format_spec: str,
        subtitles: List[str] = None,
        output_format: str = None,
        progress_callback: Callable = None
    ) -> dict:
        """
        异步下载视频
        progress_callback 接收 dict: {
            'status': 'downloading' | 'finished' | 'error',
            'filename': str,
            'downloaded_bytes': int,
            'total_bytes': int,
            'speed': int,
            'eta': int
        }
        """
        pass
    
    def cancel(self):
        """取消下载"""
        self._cancel_flag = True
```

### 5. src/ui/components.py - UI组件

```python
from nicegui import ui
from models.video import VideoInfo, FormatInfo

class FormatListComponent:
    """格式列表组件"""
    
    def __init__(self, video_info: VideoInfo):
        self.video_info = video_info
        self.selected_video: Optional[FormatInfo] = None
        self.selected_audio: List[FormatInfo] = []
        self.selected_subtitles: List[str] = []
    
    def build(self) -> ui.row:
        """构建格式列表UI"""
        pass

class ConfirmDialog:
    """确认对话框"""
    
    def __init__(self, message: str, on_confirm, on_cancel=None):
        pass
    
    def show(self):
        """显示对话框"""
        pass
```

### 6. src/app.py - 主应用

```python
from nicegui import ui
from core.parser import parse_video
from core.downloader import Downloader
from core.utils import build_format_spec, recommend_output_format
from models.video import VideoInfo

class YtdlpApp:
    def __init__(self):
        self.video_info: Optional[VideoInfo] = None
        self.downloader = Downloader()
        self.load_config()
    
    def build(self):
        """构建主界面"""
        with ui.column():
            # URL输入
            self.url_input = ui.input(...).on('change', self.on_url_change)
            ui.button('解析', on_click=self.parse_url)
            
            # 下载目录
            self.download_dir = ui.textarea(...)
            ui.button('选择目录', on_click=self.select_directory)
            
            # 视频信息展示
            self.video_info_card = ui.card()
            
            # 质量选择
            with ui.row():
                ui.radio(['best', 'custom'], value='best').on_change(...)
            
            # 格式列表（自定义模式下显示）
            self.format_list = FormatListComponent(...)
            
            # 输出格式
            self.output_format = ui.select(['auto', 'mp4', 'mkv', 'webm'], value='auto')
            
            # 文件名模板
            self.filename_template = ui.input(...)
            
            # 下载按钮
            ui.button('下载', on_click=self.start_download)
            
            # 进度显示
            self.progress_bar = ui.progress_bar()
    
    async def parse_url(self):
        """解析URL"""
        pass
    
    async def start_download(self):
        """开始下载"""
        pass
    
    def load_config(self):
        """加载配置"""
        pass
    
    def save_config(self):
        """保存配置"""
        pass

app = YtdlpApp()
ui.run(title='yt-dlp Downloader')
```

### 7. config/settings.json - 配置文件

```json
{
  "download_directory": "C:\\Users\\%USERNAME%\\Downloads",
  "filename_template": "%(title)s.%(ext)s",
  "remember_last_directory": true,
  "default_quality_mode": "best",
  "default_output_format": "auto",
  "auto_download_subtitles": true,
  "preferred_language": "zh-Hans"
}
```

---

## 安装与运行步骤

```bash
# 1. 创建项目目录
mkdir yt-dlp-ui
cd yt-dlp-ui

# 2. 初始化uv项目
uv init

# 3. 编辑pyproject.toml（使用上述配置）

# 4. 安装依赖
uv sync

# 5. 创建目录结构
mkdir src/core src/ui src/models src/config tests

# 6. 创建所需文件（使用上述代码）

# 7. 运行
uv run python src/app.py
```

---

## 功能清单

### 必选功能（第一阶段）

1. **URL解析**
   - 输入视频URL
   - 提取视频信息（标题、缩略图、时长）
   - 获取可用格式列表

2. **质量选择模式**
   - 最佳质量模式（yt-dlp自动选择）
   - 自定义选择模式（手动选择）

3. **格式列表展示**
   - 分组显示（视频/音频/字幕）
   - 视频：单选
   - 音频：多选
   - 字幕：多选
   - 智能默认选择

4. **下载功能**
   - 异步下载
   - 实时进度显示
   - 取消下载

5. **配置管理**
   - 下载目录选择
   - 启动时自动加载上次设置

6. **用户确认**
   - 未选择音频时的确认弹窗
   - 未选择视频时的确认弹窗
   - 转码确认弹窗

### 可选功能（后续阶段）

- 批量下载
- 下载历史记录
- 下载任务管理
- 代理设置
- Cookie管理

---

## 关键逻辑总结

### 字幕智能选择

```python
PRIORITY_LANGUAGES = ['zh-Hans', 'zh-Hant', 'en']

def auto_select_subtitles(subtitles: Dict[str, List[str]]) -> List[str]:
    for lang in PRIORITY_LANGUAGES:
        if lang in subtitles:
            return [lang]
    return []
```

### 输出格式智能推荐

```python
def recommend_output_format(video, audio_list):
    if not video and not audio_list:
        return 'mkv'
    
    # mp4兼容编码
    mp4_video = video.vcodec.startswith('avc') if video else False
    mp4_audio = all(a.acodec.startswith('mp4a') for a in audio_list)
    
    return 'mp4' if (mp4_video and mp4_audio) else 'mkv'
```

### 格式规格构建

```python
def build_format_spec(video, audio_list):
    parts = []
    if video:
        parts.append(video.format_id)
    for audio in audio_list:
        parts.append(audio.format_id)
    return '+'.join(parts) if parts else 'bestaudio/best'
```

---

## NiceGUI参考资源

- 文档：https://nicegui.io/
- GitHub：https://github.com/zauberzeug/nicegui
- 示例：https://github.com/zauberzeug/nicegui/tree/main/examples

---

