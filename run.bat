@echo off
chcp 65001 >nul
set IS_DOCKER=false
set PYTHONIOENCODING=utf-8
uv run run.py
pause