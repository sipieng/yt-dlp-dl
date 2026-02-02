"""
yt-dlp下载器服务
封装yt-dlp功能，提供视频解析和下载服务
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import tempfile
import shutil

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError, ExtractorError, sanitize_filename


class YouTubeDownloader:
    """YouTube下载器服务类"""

    def __init__(self, downloads_dir: str = "downloads"):
        """
        初始化下载器

        Args:
            downloads_dir: 下载文件存储目录
        """
        self.downloads_dir = Path(downloads_dir)
        self.downloads_dir.mkdir(exist_ok=True)

        # 基础yt-dlp选项
        self.base_opts = {
            "quiet": True,
            "no_warnings": True,  # 减少警告输出
            "ignoreerrors": True,
            "no_color": True,
            "extract_flat": False,
            "socket_timeout": 30,
            # 针对YouTube的优化设置
            "youtube_include_dash_manifest": False,
            "youtube_include_hls_manifest": False,
            # 防止文件系统操作
            "overwrites": True,
            "noplaylist": True,
            "nocheckcertificate": True,
            "verbose": False,
            # 禁用不需要的功能
            "writethumbnail": False,
            "writeinfojson": False,
            "writesubtitles": False,
            "writeautomaticsub": False,
            "getcomments": False,
            "getchannel": False,
            "getid": False,
            "getthumbnail": False,
            "getdescription": False,
            "getfilename": False,
            "getformat": False,
            "geturl": False,
            "getduration": False,
            "gettitle": False,
        }

    def extract_info(self, url: str) -> Dict[str, Any]:
        """
        提取视频信息和可用格式

        Args:
            url: 视频URL

        Returns:
            包含视频信息和格式列表的字典
        """
        try:
            # 调试信息
            import sys

            print(f"[DEBUG] extract_info called for URL: {url}", file=sys.stderr)

            opts = self.base_opts.copy()
            opts.update(
                {
                    "skip_download": True,
                    "listformats": False,  # 我们手动处理格式
                    # 使用简单的输出模板避免路径问题
                    "outtmpl": "%(id)s.%(ext)s",
                    "paths": {"home": "."},
                }
            )

            with YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)

                if not info:
                    raise ValueError("无法提取视频信息")

                # 调试：成功提取
                print(
                    f"[DEBUG] Successfully extracted info, title: {repr(info.get('title', ''))[:100]}",
                    file=sys.stderr,
                )
                print(
                    f"[DEBUG] Formats count: {len(info.get('formats', []))}",
                    file=sys.stderr,
                )

                # 获取可用格式
                formats = info.get("formats", [])

                # 分类格式化格式数据
                categorized_formats = self._categorize_formats(formats)

                # 获取最佳默认组合（仿照yt-dlp默认逻辑）
                best_default = self._get_best_default(formats)

                # 构建响应数据
                result = {
                    "title": info.get("title", "未知标题"),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "upload_date": info.get("upload_date", ""),
                    "view_count": info.get("view_count", 0),
                    "formats": categorized_formats,
                    "best_default": best_default,
                    "url": url,
                    "extractor": info.get("extractor", ""),
                    "webpage_url": info.get("webpage_url", url),
                }

                # 调试：结果构建完成
                print(
                    f"[DEBUG] Result built successfully, keys: {list(result.keys())}",
                    file=sys.stderr,
                )

                return result

        except ExtractorError as e:
            print(f"[DEBUG] ExtractorError: {e}", file=sys.stderr)
            raise ValueError(f"提取视频信息失败: {str(e)}")
        except DownloadError as e:
            print(f"[DEBUG] DownloadError: {e}", file=sys.stderr)
            raise ValueError(f"下载信息失败: {str(e)}")
        except Exception as e:
            print(
                f"[DEBUG] Unexpected error in extract_info: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
            import traceback

            traceback.print_exc(file=sys.stderr)
            raise ValueError(f"处理视频时出错: {str(e)}")

    def _categorize_formats(self, formats: List[Dict]) -> Dict[str, List[Dict]]:
        """
        将格式分类为视频、音频、字幕

        Args:
            formats: 原始格式列表

        Returns:
            分类后的格式字典
        """
        video_formats = []
        audio_formats = []
        subtitle_formats = []

        for fmt in formats:
            # 清理格式数据
            cleaned_fmt = self._clean_format_data(fmt)

            # 分类逻辑
            vcodec = fmt.get("vcodec", "none")
            acodec = fmt.get("acodec", "none")
            format_id = fmt.get("format_id", "")

            # 判断是否为纯音频
            if vcodec == "none" and acodec != "none":
                audio_formats.append(cleaned_fmt)

            # 判断是否为纯视频
            elif vcodec != "none" and acodec == "none":
                video_formats.append(cleaned_fmt)

            # 判断是否为既有视频又有音频（合并格式）
            elif vcodec != "none" and acodec != "none":
                # 同时添加到视频和音频列表，但标记为合并格式
                video_copy = cleaned_fmt.copy()
                video_copy["is_combined"] = True
                video_formats.append(video_copy)

                audio_copy = cleaned_fmt.copy()
                audio_copy["is_combined"] = True
                audio_formats.append(audio_copy)

            # 其他情况（可能是字幕或其他格式）
            else:
                # 检查是否为字幕格式
                if fmt.get("ext") in ["vtt", "srt", "ass", "ssa", "ttml"]:
                    subtitle_formats.append(cleaned_fmt)

        # 按质量排序
        video_formats.sort(
            key=lambda x: (
                -self._get_resolution_value(x.get("resolution", "0x0")),
                -(x.get("tbr") or 0),
                x.get("format_id", ""),
            )
        )

        audio_formats.sort(
            key=lambda x: (
                -(x.get("abr") or 0),
                -(x.get("asr") or 0),
                x.get("format_id", ""),
            )
        )

        return {
            "video": video_formats,
            "audio": audio_formats,
            "subtitle": subtitle_formats,
        }

    def _clean_format_data(self, fmt: Dict) -> Dict:
        """清理和标准化格式数据"""
        cleaned = {}

        # 基本字段
        for key in [
            "format_id",
            "ext",
            "resolution",
            "fps",
            "vcodec",
            "acodec",
            "filesize",
            "tbr",
        ]:
            cleaned[key] = fmt.get(key)

        # 视频特定字段
        if fmt.get("vcodec") != "none":
            cleaned["height"] = fmt.get("height")
            cleaned["width"] = fmt.get("width")
            cleaned["dynamic_range"] = fmt.get("dynamic_range")
            cleaned["video_ext"] = fmt.get("video_ext")

        # 音频特定字段
        if fmt.get("acodec") != "none":
            cleaned["abr"] = fmt.get("abr")
            cleaned["asr"] = fmt.get("asr")
            cleaned["audio_ext"] = fmt.get("audio_ext")

        # 计算文件大小字符串
        filesize = fmt.get("filesize")
        if filesize:
            if filesize > 1024 * 1024:  # MB
                cleaned["filesize_str"] = f"{filesize / (1024 * 1024):.2f} MB"
            elif filesize > 1024:  # KB
                cleaned["filesize_str"] = f"{filesize / 1024:.2f} KB"
            else:  # Bytes
                cleaned["filesize_str"] = f"{filesize} B"
        else:
            cleaned["filesize_str"] = "未知"

        # 码率字符串
        tbr = fmt.get("tbr")
        if tbr:
            cleaned["tbr_str"] = f"{tbr:.0f} kbps"
        else:
            cleaned["tbr_str"] = "未知"

        # 采样率字符串
        asr = fmt.get("asr")
        if asr:
            cleaned["asr_str"] = f"{asr / 1000:.1f} kHz"
        else:
            cleaned["asr_str"] = "未知"

        # 分辨率字符串
        resolution = fmt.get("resolution")
        if resolution and resolution != "audio only":
            cleaned["resolution_str"] = resolution
        elif fmt.get("height") and fmt.get("width"):
            cleaned["resolution_str"] = f"{fmt['width']}x{fmt['height']}"
        else:
            cleaned["resolution_str"] = "未知"

        return cleaned

    def _get_resolution_value(self, resolution_str: str) -> int:
        """从分辨率字符串中提取高度值用于排序"""
        if not resolution_str or resolution_str == "audio only":
            return 0

        # 尝试提取高度值（如 "1920x1080" -> 1080）
        match = re.search(r"(\d+)x(\d+)", resolution_str)
        if match:
            return int(match.group(2))  # 返回高度

        # 尝试提取单独的高度值（如 "1080p" -> 1080）
        match = re.search(r"(\d+)p", resolution_str)
        if match:
            return int(match.group(1))

        return 0

    def _get_best_default(self, formats: List[Dict]) -> Dict[str, str]:
        """
        获取最佳默认格式组合（仿照yt-dlp默认逻辑）

        Args:
            formats: 原始格式列表

        Returns:
            最佳格式组合字典
        """
        try:
            # 使用yt-dlp的默认格式选择逻辑
            opts = self.base_opts.copy()
            opts.update(
                {
                    "format": "best",  # 让yt-dlp选择最佳格式
                    "skip_download": True,
                    "quiet": True,
                }
            )

            with YoutubeDL(opts) as ydl:
                # 提取格式选择信息
                ydl.params["format"] = "best"
                selected_formats = ydl.build_format_selector("best")(formats)

                if not selected_formats:
                    # 回退到手动选择
                    return self._fallback_best_selection(formats)

                # 分析选择的格式
                best_video = None
                best_audio = None

                for fmt in selected_formats:
                    vcodec = fmt.get("vcodec", "none")
                    acodec = fmt.get("acodec", "none")
                    format_id = fmt.get("format_id")

                    if vcodec != "none" and acodec == "none":
                        best_video = format_id
                    elif vcodec == "none" and acodec != "none":
                        best_audio = format_id
                    elif vcodec != "none" and acodec != "none":
                        # 合并格式，拆分为视频和音频
                        best_video = format_id
                        best_audio = format_id

                # 如果没有找到合适的格式，使用回退方案
                if not best_video or not best_audio:
                    return self._fallback_best_selection(formats)

                # 确定最佳容器格式
                container = self._determine_best_container(
                    formats, best_video, best_audio
                )

                return {
                    "video": best_video,
                    "audio": best_audio,
                    "container": container,
                }

        except Exception:
            # 出错时使用回退方案
            return self._fallback_best_selection(formats)

    def _fallback_best_selection(self, formats: List[Dict]) -> Dict[str, str]:
        """回退的最佳格式选择逻辑"""
        # 简单的启发式选择：最高分辨率视频 + 最高质量音频
        video_formats = [
            f
            for f in formats
            if f.get("vcodec", "none") != "none" and f.get("acodec", "none") == "none"
        ]
        audio_formats = [
            f
            for f in formats
            if f.get("vcodec", "none") == "none" and f.get("acodec", "none") != "none"
        ]

        # 选择最高分辨率视频
        best_video = None
        if video_formats:
            video_formats.sort(
                key=lambda x: (
                    -self._get_resolution_value(x.get("resolution", "0x0")),
                    -x.get("tbr", 0),
                )
            )
            best_video = video_formats[0].get("format_id", "137")  # 默认1080p

        # 选择最高质量音频
        best_audio = None
        if audio_formats:
            audio_formats.sort(key=lambda x: (-x.get("abr", 0), -x.get("asr", 0)))
            best_audio = audio_formats[0].get("format_id", "251")  # 默认opus

        # 使用合理的默认值
        if not best_video:
            best_video = "137"  # 1080p视频
        if not best_audio:
            best_audio = "251"  # opus音频

        return {
            "video": best_video,
            "audio": best_audio,
            "container": "mkv",  # 最兼容的容器
        }

    def _determine_best_container(
        self, formats: List[Dict], video_id: str, audio_id: str
    ) -> str:
        """
        根据视频和音频编码确定最佳容器格式

        Args:
            formats: 格式列表
            video_id: 视频格式ID
            audio_id: 音频格式ID

        Returns:
            最佳容器格式 (mp4/mkv/webm)
        """
        # 查找格式信息
        video_fmt = next((f for f in formats if f.get("format_id") == video_id), None)
        audio_fmt = next((f for f in formats if f.get("format_id") == audio_id), None)

        if not video_fmt or not audio_fmt:
            return "mkv"  # MKV最兼容

        # 检查编码兼容性
        video_codec = video_fmt.get("vcodec", "")
        audio_codec = audio_fmt.get("acodec", "")
        video_ext = video_fmt.get("ext", "")
        audio_ext = audio_fmt.get("ext", "")

        # 简单规则：如果两者都是mp4/m4a，使用mp4；否则使用mkv
        if "mp4" in video_ext and "m4a" in audio_ext:
            return "mp4"
        elif "webm" in video_ext and "webm" in audio_ext:
            return "webm"
        else:
            return "mkv"

    def download_video(
        self, params: Dict, progress_callback=None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        下载视频

        Args:
            params: 下载参数
            progress_callback: 进度回调函数

        Returns:
            (成功标志, 消息, 文件名)
        """
        try:
            # 解析参数
            url = params.get("url")
            mode = params.get("mode", "default")
            filename = params.get("filename")
            container = params.get("container")
            formats = params.get("formats", {})

            if not url:
                return False, "缺少URL参数", None

            # 构建yt-dlp选项
            ydl_opts = self.base_opts.copy()
            ydl_opts.update(
                {
                    "outtmpl": str(self.downloads_dir / "%(title)s [%(id)s].%(ext)s"),
                    "progress_hooks": [progress_callback] if progress_callback else [],
                    "merge_output_format": container if container else None,
                }
            )

            # 处理自定义文件名
            if filename:
                # 清理文件名，移除非法字符
                safe_filename = sanitize_filename(filename)
                # 保留扩展名空间
                ydl_opts["outtmpl"] = str(
                    self.downloads_dir / f"{safe_filename}.%(ext)s"
                )

            # 构建格式选择字符串
            if mode == "default" and formats:
                # 使用默认最佳格式
                video_id = formats.get("video")
                audio_id = formats.get("audio")
                if video_id and audio_id:
                    ydl_opts["format"] = f"{video_id}+{audio_id}"
                else:
                    ydl_opts["format"] = "best"

            elif mode == "custom" and formats:
                # 使用自定义格式
                video_id = formats.get("video")
                audio_id = formats.get("audio")
                subtitle_id = formats.get("subtitle")

                format_parts = []
                if video_id:
                    format_parts.append(video_id)
                if audio_id:
                    format_parts.append(audio_id)
                if subtitle_id:
                    format_parts.append(subtitle_id)

                if format_parts:
                    ydl_opts["format"] = "+".join(format_parts)
                else:
                    ydl_opts["format"] = "best"

            else:
                # 回退到最佳质量
                ydl_opts["format"] = "best"

            # 执行下载
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)

                if not info:
                    return False, "下载失败：无法获取视频信息", None

                # 获取实际下载的文件名
                downloaded_files = []
                if ydl.params.get("outtmpl"):
                    # 尝试从info中提取文件名
                    actual_filename = ydl.prepare_filename(info)
                    downloaded_files.append(actual_filename)

                # 如果启用合并，会有最终合并的文件
                if ydl.params.get("merge_output_format"):
                    # 合并后的文件名可能不同
                    final_filename = ydl.prepare_filename(info)
                    if final_filename and os.path.exists(final_filename):
                        downloaded_files.append(final_filename)

                # 返回成功消息
                if downloaded_files:
                    final_file = downloaded_files[-1]
                    return True, "下载完成", os.path.basename(final_file)
                else:
                    return True, "下载完成但无法确定文件名", None

        except DownloadError as e:
            return False, f"下载失败: {str(e)}", None
        except Exception as e:
            return False, f"下载时出错: {str(e)}", None

    def get_downloaded_file_path(self, filename: str) -> Optional[Path]:
        """
        获取已下载文件的完整路径

        Args:
            filename: 文件名

        Returns:
            文件路径或None
        """
        filepath = self.downloads_dir / filename
        if filepath.exists():
            return filepath
        return None

    def cleanup_old_files(self, max_age_hours: int = 24):
        """清理旧文件（可选功能）"""
        pass  # 暂时不实现，因为要求永久保留
