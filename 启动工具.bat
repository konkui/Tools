@echo off
chcp 65001 >nul
title GameDevKit 开发服务器（关闭此窗口即停止）
cd /d %~dp0
echo 正在启动 GameDevKit，浏览器将自动打开页面...
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5173/"
npm run dev
pause
