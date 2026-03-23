@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   GitHub 图床上传测试
echo ========================================
echo.
echo 请先设置 GitHub Token:
echo   set GITHUB_TOKEN=your_github_token_here
echo.
echo 然后运行:
echo   test-github-upload.bat
echo.
echo ========================================
echo.

REM 检查是否设置了 GITHUB_TOKEN
if "%GITHUB_TOKEN%"=="" (
    echo [错误] 请先设置 GITHUB_TOKEN 环境变量！
    echo.
    echo 示例:
    echo   set GITHUB_TOKEN=ghp_xxxxxxxxxxxx
    echo   test-github-upload.bat
    echo.
    pause
    exit /b 1
)

REM 运行测试脚本
node test-github-upload.js

echo.
pause
