@echo off
chcp 65001 >nul

title Wind Allin

echo ===============================
echo   Wind Allin Launcher
echo ===============================

set ROOT_DIR=%~dp0

echo [1/2] Starting backend...
cd /d "%ROOT_DIR%..\md-converter"
start "Wind-Backend" cmd /k "npm run dev"

echo [2/2] Starting frontend...
cd /d "%ROOT_DIR%"
start "Wind-Frontend" cmd /k "npm run dev"

echo.
echo ===============================
echo   Done!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo ===============================
pause