"""
yt-dlp Web UI - Flask应用程序
提供基于Web的视频下载界面
"""

import os
import uuid
import threading
import time
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file, url_for

# 导入下载器服务
from services.downloader import YouTubeDownloader

# 创建Flask应用
app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24).hex()
app.config["JSON_AS_ASCII"] = False  # 允许JSON包含非ASCII字符
app.config["SERVER_NAME"] = "127.0.0.1:5000"
app.config["APPLICATION_ROOT"] = "/"
app.config["PREFERRED_URL_SCHEME"] = "http"

# 初始化下载器
downloader = YouTubeDownloader(downloads_dir="downloads")

# 确保下载目录存在
downloads_dir = Path("downloads")
downloads_dir.mkdir(exist_ok=True)

# 全局下载任务状态存储
download_tasks = {}
# 当前活动任务ID（确保单任务）
current_task_id = None


def create_app():
    """应用工厂函数"""
    return app


@app.route("/")
def index():
    """渲染主页面"""
    return render_template("index.html")


@app.route("/api/parse", methods=["POST"])
def parse_url():
    """解析URL，返回视频信息和可用格式"""
    try:
        data = request.get_json()
        if not data or "url" not in data:
            return jsonify({"error": "缺少URL参数"}), 400

        url = data["url"].strip()
        if not url:
            return jsonify({"error": "URL不能为空"}), 400

        # 调用下载器解析URL
        info = downloader.extract_info(url)

        # 调试：检查info结构
        try:
            title_preview = info.get("title", "未知")[:50]
            app.logger.debug(f"解析成功，标题: {repr(title_preview)}...")
        except:
            app.logger.debug("解析成功，但无法记录标题预览")

        # 确保数据可JSON序列化
        try:
            import json

            # 测试序列化
            json.dumps(info, ensure_ascii=False)
        except Exception as json_err:
            try:
                app.logger.error(f"JSON序列化测试失败: {repr(json_err)}")
            except:
                app.logger.error("JSON序列化测试失败（无法记录详情）")
            # 清理数据
            cleaned_info = _clean_json_data(info)
            return jsonify(cleaned_info)

        return jsonify(info)

    except Exception as e:
        try:
            error_msg = str(e)
            app.logger.error(f"解析URL时出错: {repr(error_msg)}", exc_info=True)
        except:
            app.logger.error("解析URL时出错（无法记录错误详情）", exc_info=True)
        return jsonify({"error": f"解析失败: {str(e)}"}), 500


def _clean_json_data(obj):
    """清理数据确保可JSON序列化"""
    if isinstance(obj, dict):
        cleaned = {}
        for key, value in obj.items():
            try:
                cleaned[key] = _clean_json_data(value)
            except:
                # 如果无法清理，跳过该字段
                continue
        return cleaned
    elif isinstance(obj, list):
        return [_clean_json_data(item) for item in obj]
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    else:
        # 将其他类型转换为字符串
        try:
            return str(obj)
        except:
            return None


@app.route("/api/download", methods=["POST"])
def start_download():
    """启动下载任务"""
    global current_task_id

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "无效的请求数据"}), 400

        # 检查是否有正在进行的任务
        if current_task_id and download_tasks.get(current_task_id, {}).get(
            "status"
        ) in ["downloading", "queued"]:
            return jsonify({"error": "已有下载任务正在进行中，请等待完成"}), 429

        # 生成新任务ID
        task_id = str(uuid.uuid4())
        current_task_id = task_id

        # 创建任务状态
        download_tasks[task_id] = {
            "status": "queued",
            "progress": 0,
            "message": "任务已排队",
            "filename": None,
            "error": None,
            "download_url": None,
        }

        # 启动后台下载线程
        thread = threading.Thread(
            target=download_worker, args=(task_id, data), daemon=True
        )
        thread.start()

        return jsonify(
            {"task_id": task_id, "status": "queued", "message": "下载任务已开始"}
        )

    except Exception as e:
        app.logger.error(f"启动下载时出错: {str(e)}")
        return jsonify({"error": f"启动下载失败: {str(e)}"}), 500


@app.route("/api/status/<task_id>")
def get_status(task_id):
    """查询任务状态"""
    task_info = download_tasks.get(task_id)
    if not task_info:
        return jsonify({"error": "任务不存在"}), 404

    return jsonify(task_info)


@app.route("/downloads/<filename>")
def download_file(filename):
    """提供文件下载"""
    try:
        filepath = downloader.get_downloaded_file_path(filename)
        if not filepath or not filepath.exists():
            return jsonify({"error": "文件不存在"}), 404

        return send_file(filepath, as_attachment=True, download_name=filename)
    except Exception as e:
        app.logger.error(f"下载文件时出错: {str(e)}")
        return jsonify({"error": f"下载失败: {str(e)}"}), 500


def progress_hook(task_id, d):
    """下载进度回调函数"""
    if task_id not in download_tasks:
        return

    task_info = download_tasks[task_id]

    if d["status"] == "downloading":
        # 计算下载进度
        if d.get("total_bytes"):
            progress = (d.get("downloaded_bytes", 0) / d["total_bytes"]) * 100
        elif d.get("total_bytes_estimate"):
            progress = (d.get("downloaded_bytes", 0) / d["total_bytes_estimate"]) * 100
        else:
            progress = task_info.get("progress", 0)

        download_tasks[task_id].update(
            {
                "status": "downloading",
                "progress": round(progress, 2),
                "message": f"下载中: {d.get('_percent_str', '0%')} - {d.get('_speed_str', '')}",
                "speed": d.get("_speed_str", ""),
                "eta": d.get("_eta_str", ""),
            }
        )

    elif d["status"] == "finished":
        download_tasks[task_id].update(
            {
                "progress": 100,
                "message": "下载完成，正在合并文件...",
                "status": "merging",
            }
        )

    elif d["status"] == "error":
        download_tasks[task_id].update(
            {
                "status": "failed",
                "error": str(d.get("error", "未知错误")),
                "message": f"下载失败: {d.get('error', '未知错误')}",
            }
        )


def download_worker(task_id, params):
    """后台下载工作线程"""
    with app.app_context():
        try:
            # 更新状态为下载中
            download_tasks[task_id].update(
                {"status": "downloading", "progress": 0, "message": "开始下载..."}
            )

            # 创建进度回调函数
            def progress_callback(d):
                progress_hook(task_id, d)

            # 执行下载
            success, message, filename = downloader.download_video(
                params, progress_callback=progress_callback
            )

            if success:
                # 下载成功
                download_url = f"/downloads/{filename}" if filename else None

                download_tasks[task_id].update(
                    {
                        "status": "completed",
                        "progress": 100,
                        "message": message or "下载完成",
                        "filename": filename,
                        "download_url": download_url,
                    }
                )
            else:
                # 下载失败
                download_tasks[task_id].update(
                    {
                        "status": "failed",
                        "error": message,
                        "message": f"下载失败: {message}",
                    }
                )

        except Exception as e:
            # 异常处理，确保能记录日志
            try:
                app.logger.error(f"下载任务 {task_id} 失败: {str(e)}")
            except:
                # 如果logger失败，至少输出到控制台
                print(f"下载任务 {task_id} 失败: {str(e)}")
            download_tasks[task_id].update(
                {"status": "failed", "error": str(e), "message": f"下载失败: {str(e)}"}
            )


@app.route("/health")
def health_check():
    """健康检查端点"""
    return jsonify({"status": "healthy", "service": "yt-dlp-web-ui"})


# 清理过期任务的函数（可选）
def cleanup_old_tasks():
    """清理完成或失败超过24小时的任务"""
    current_time = time.time()
    tasks_to_remove = []

    for task_id, task_info in list(download_tasks.items()):
        if task_info.get("status") in ["completed", "failed"]:
            # 如果是24小时前的任务，标记为删除
            if current_time - task_info.get("timestamp", 0) > 24 * 3600:
                tasks_to_remove.append(task_id)

    for task_id in tasks_to_remove:
        download_tasks.pop(task_id, None)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
