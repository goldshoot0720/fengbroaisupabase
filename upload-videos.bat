@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🎬 影片上傳到 Netlify Blobs
echo ========================================
echo.

echo 📋 檢查環境...
if not exist "scripts\upload-videos.js" (
    echo ❌ 找不到上傳腳本
    echo 請確保在專案根目錄執行此腳本
    pause
    exit /b 1
)

if not exist "public\videos" (
    echo ❌ 找不到 public\videos 目錄
    echo 請先創建目錄並放入影片檔案
    pause
    exit /b 1
)

echo ✅ 環境檢查完成
echo.

echo 📁 檢查影片檔案...
dir "public\videos\*.mp4" /b 2>nul
if errorlevel 1 (
    echo ❌ 在 public\videos 目錄中找不到 MP4 檔案
    echo 請先將影片檔案放入該目錄
    pause
    exit /b 1
)

echo ✅ 找到影片檔案
echo.

echo 🚀 開始上傳影片到 Netlify Blobs...
echo.
node scripts\upload-videos.js

echo.
if errorlevel 1 (
    echo ❌ 上傳過程中發生錯誤
    echo.
    echo 🔧 故障排除建議:
    echo 1. 檢查網路連接
    echo 2. 確認 Netlify 權限
    echo 3. 檢查環境變數設定
    echo 4. 確認影片檔案完整性
) else (
    echo ✅ 影片上傳完成！
    echo.
    echo 💡 下一步:
    echo 1. 訪問 http://localhost:3001 查看影片庫
    echo 2. 或打開 test-new-video.html 測試新影片
    echo 3. 檢查 Netlify 控制台確認上傳狀態
)

echo.
echo 按任意鍵繼續...
pause >nul