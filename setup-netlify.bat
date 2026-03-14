@echo off
echo ========================================
echo Netlify CLI 設置和影片上傳腳本
echo ========================================
echo.

echo 1. 檢查 Netlify CLI 版本...
netlify --version
if %errorlevel% neq 0 (
    echo ❌ Netlify CLI 無法執行
    echo 請檢查安裝是否成功
    pause
    exit /b 1
)
echo ✅ Netlify CLI 已安裝
echo.

echo 2. 檢查登入狀態...
netlify status
if %errorlevel% neq 0 (
    echo ⚠️  尚未登入或連結網站
    echo 請執行以下命令：
    echo   netlify login
    echo   netlify link
    pause
    exit /b 1
)
echo ✅ 已登入並連結網站
echo.

echo 3. 測試 Netlify Blobs 連接...
node scripts/test-blobs-connection.js
if %errorlevel% neq 0 (
    echo ❌ Blobs 連接測試失敗
    echo 請檢查 Blobs 功能是否已啟用
    pause
    exit /b 1
)
echo ✅ Blobs 連接測試成功
echo.

echo 4. 上傳影片到 Netlify Blobs...
node scripts/upload-videos.js
if %errorlevel% neq 0 (
    echo ❌ 影片上傳失敗
    pause
    exit /b 1
)
echo ✅ 影片上傳成功
echo.

echo 5. 驗證上傳結果...
node scripts/check-blobs.js
echo.

echo ========================================
echo 🎉 所有步驟完成！
echo 現在可以在網站上查看影片了
echo ========================================
pause