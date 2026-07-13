@echo off
chcp 65001 >nul
echo ========================================
echo 🎵 音樂上傳到 Netlify Blobs
echo ========================================
echo.

REM 檢查環境變數
if "%NETLIFY_SITE_ID%"=="" (
    echo ❌ 錯誤: 未設置 NETLIFY_SITE_ID 環境變數
    echo.
    echo 請先設置環境變數:
    echo set NETLIFY_SITE_ID=你的站點ID
    echo set NETLIFY_AUTH_TOKEN=你的認證令牌
    echo.
    pause
    exit /b 1
)

if "%NETLIFY_AUTH_TOKEN%"=="" (
    echo ❌ 錯誤: 未設置 NETLIFY_AUTH_TOKEN 環境變數
    echo.
    echo 請先設置環境變數:
    echo set NETLIFY_SITE_ID=你的站點ID
    echo set NETLIFY_AUTH_TOKEN=你的認證令牌
    echo.
    pause
    exit /b 1
)

echo ✅ 環境變數檢查通過
echo.
echo 📂 掃描 public/music 目錄...
echo.

REM 執行上傳腳本
node scripts/upload-music.js

echo.
echo ========================================
echo 上傳完成！
echo ========================================
echo.
pause
