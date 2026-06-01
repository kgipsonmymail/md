@echo off
echo ==============================
echo   正在安装依赖（首次可能需要几分钟）...
echo ==============================
cd /d "%~dp0"
call npx pnpm install --no-frozen-lockfile
echo.
echo ==============================
echo   正在启动前端开发服务器...
echo ==============================
cd /d "%~dp0apps\web"
call npx vite --port 8081
pause