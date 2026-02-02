@echo off
REM yt-dlp Web UI 启动脚本 - Windows版本
REM 使用虚拟环境中的Python启动Flask应用

echo =======================================================
echo yt-dlp Web UI 启动器
echo =======================================================

REM 检查虚拟环境是否存在
if not exist ".venv\Scripts\python.exe" (
    echo 错误: 未找到Python虚拟环境 (.venv)
    echo 请先运行: uv sync
    pause
    exit /b 1
)

REM 启动Flask应用
echo.
echo 正在启动Flask服务器...
echo 访问地址: http://127.0.0.1:5000
echo 按 Ctrl+C 停止服务器
echo.
echo =======================================================

REM 运行Python脚本
.venv\Scripts\python.exe run.py

if errorlevel 1 (
    echo.
    echo 启动失败，请检查错误信息
    pause
)