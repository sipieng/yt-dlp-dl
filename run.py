#!/usr/bin/env python3
"""
yt-dlp Web UI 启动脚本
运行此脚本启动Flask Web界面
"""

import os
import sys
import webbrowser
import threading
import time
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()


def main():
    """主函数"""
    print("=" * 60)
    print("yt-dlp Web UI 启动器")
    print("=" * 60)

    # 检查是否运行在 Docker 环境中
    is_docker = os.environ.get("IS_DOCKER", "false").lower() in ("true", "1", "yes")
    if is_docker:
        print("📦 Docker 环境")

    # 从环境变量读取端口配置
    port = int(os.environ.get("PORT", "5000"))

    # 检查依赖
    try:
        from app import app, downloader

        print("✅ 检查依赖: Flask应用和下载器已就绪")
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        print("请确保已安装依赖: uv add flask yt-dlp")
        return 1

    # 检查下载目录
    downloads_dir = Path("downloads")
    downloads_dir.mkdir(exist_ok=True)
    print(f"✅ 下载目录: {downloads_dir.absolute()}")

    # 提示用户
    print("\n启动信息:")
    print(f"  • Flask服务器将运行在: http://0.0.0.0:{port}")
    print("  • 按 Ctrl+C 停止服务器")
    print("  • 测试URL: https://www.youtube.com/watch?v=ZEjLaSf4cCA")
    print("\n" + "=" * 60)

    # Docker 环境下不自动打开浏览器
    if not is_docker:
        # 尝试自动打开浏览器
        def open_browser():
            time.sleep(2)  # 等待服务器启动
            try:
                webbrowser.open(f"http://127.0.0.1:{port}")
                print("✅ 已尝试在浏览器中打开Web界面")
            except:
                print(f"⚠️  无法自动打开浏览器，请手动访问: http://127.0.0.1:{port}")

        # 启动浏览器线程
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()

    # 运行Flask应用（Docker 环境下禁用 debug 模式）
    try:
        app.run(debug=not is_docker, host="0.0.0.0", port=port, use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n服务器已停止")
    except Exception as e:
        print(f"\n❌ 服务器启动失败: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
