@echo off
echo ========================================
echo Netlify 登入和連結腳本
echo ========================================
echo.

echo 步驟 1: 檢查 Netlify CLI...
netlify --version
if %errorlevel% neq 0 (
    echo ❌ Netlify CLI 無法執行
    echo 請確保已正確安裝 Netlify CLI
    pause
    exit /b 1
)
echo ✅ Netlify CLI 可用
echo.

echo 步驟 2: 登入 Netlify...
echo 這會開啟瀏覽器，請登入您的 Netlify 帳戶
netlify login
if %errorlevel% neq 0 (
    echo ❌ 登入失敗
    pause
    exit /b 1
)
echo ✅ 登入成功
echo.

echo 步驟 3: 連結專案到 Netlify 網站...
echo 請選擇您的網站或創建新網站
netlify link
if %errorlevel% neq 0 (
    echo ❌ 連結失敗
    pause
    exit /b 1
)
echo ✅ 專案連結成功
echo.

echo 步驟 4: 檢查狀態...
netlify status
echo.

echo ========================================
echo 🎉 Netlify 配置完成！
echo 現在可以執行 setup-netlify.bat 來上傳影片
echo ========================================
pause