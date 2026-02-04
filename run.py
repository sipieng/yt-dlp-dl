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


def main():
    """主函数"""
    print("=" * 60)
    print("yt-dlp Web UI 启动器")
    print("=" * 60)

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
    print("  • Flask服务器将运行在: http://127.0.0.1:5000")
    print("  • 按 Ctrl+C 停止服务器")
    print("  • 测试URL: https://www.youtube.com/watch?v=ZEjLaSf4cCA")
    print("\n" + "=" * 60)

    # 尝试自动打开浏览器
    def open_browser():
        time.sleep(2)  # 等待服务器启动
        try:
            webbrowser.open("http://127.0.0.1:5000")
            print("✅ 已尝试在浏览器中打开Web界面")
        except:
            print("⚠️  无法自动打开浏览器，请手动访问: http://127.0.0.1:5000")

    # 启动浏览器线程
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()

    # 运行Flask应用
    try:
        app.run(debug=True, host="0.0.0.0", port=5000, use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n服务器已停止")
    except Exception as e:
        print(f"\n❌ 服务器启动失败: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
