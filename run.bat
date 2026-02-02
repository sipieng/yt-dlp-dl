@echo off
:: cd /d "%~dp0"
chcp 65001 >nul
echo 正在通过 uv 启动...
:: uv 会自己处理所有虚拟环境路径问题
uv run run.py
pause