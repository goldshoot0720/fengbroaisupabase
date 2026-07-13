@echo off
chcp 65001 >nul
cls
echo ========================================
echo 🎵 音樂庫設置和上傳嚮導
echo ========================================
echo.
echo 此嚮導將幫助你完成音樂上傳到 Netlify Blobs
echo.
pause

:CHECK_ENV
cls
echo ========================================
echo 📋 步驟 1/3: 檢查環境變數
echo ========================================
echo.

REM 檢查 .env 文件是否存在
if not exist ".env" (
    echo ❌ 找不到 .env 文件
    echo.
    echo 正在創建 .env 文件...
    (
        echo SUPABASE_URL=https://busgjgbvlrlbyolsubcj.supabase.co
        echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c2dqZ2J2bHJsYnlvbHN1YmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDMzMTEsImV4cCI6MjA4MTgxOTMxMX0.OsIW2wWqEn6bTo_7oW2RY8gAyIy87dydw1EWFMa9GQc
        echo.
        echo # Netlify 配置
        echo NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
        echo NETLIFY_AUTH_TOKEN=請在此處填入你的令牌
    ) > .env
    echo ✅ .env 文件已創建
    echo.
)

echo 檢查 Netlify 環境變數...
echo.

REM 讀取 .env 文件
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="NETLIFY_SITE_ID" set NETLIFY_SITE_ID=%%b
    if "%%a"=="NETLIFY_AUTH_TOKEN" set NETLIFY_AUTH_TOKEN=%%b
)

REM 檢查站點 ID
if "%NETLIFY_SITE_ID%"=="" (
    echo ❌ NETLIFY_SITE_ID 未設置
    set NEED_SETUP=1
) else if "%NETLIFY_SITE_ID%"=="970c7bab-2d0c-46b4-941f-1f7131995a0f" (
    echo ✅ NETLIFY_SITE_ID: 970c7bab-2d0c-46b4-941f-1f7131995a0f
) else (
    echo ⚠️  NETLIFY_SITE_ID: %NETLIFY_SITE_ID%
)

REM 檢查認證令牌
if "%NETLIFY_AUTH_TOKEN%"=="" (
    echo ❌ NETLIFY_AUTH_TOKEN 未設置
    set NEED_SETUP=1
) else if "%NETLIFY_AUTH_TOKEN%"=="請在此處填入你的令牌" (
    echo ❌ NETLIFY_AUTH_TOKEN 需要更新
    set NEED_SETUP=1
) else (
    echo ✅ NETLIFY_AUTH_TOKEN: 已設置
)

echo.

if defined NEED_SETUP (
    echo ========================================
    echo 🔑 需要設置 Netlify 認證令牌
    echo ========================================
    echo.
    echo 請按照以下步驟獲取令牌：
    echo.
    echo 1. 訪問：https://app.netlify.com/user/applications
    echo 2. 點擊「New access token」
    echo 3. 輸入描述：Music Upload Token
    echo 4. 點擊「Generate token」
    echo 5. 複製令牌
    echo.
    echo 然後編輯 .env 文件，將令牌填入：
    echo NETLIFY_AUTH_TOKEN=你的令牌
    echo.
    echo 詳細說明請查看：GET_NETLIFY_TOKEN.md
    echo.
    
    REM 打開 .env 文件供編輯
    echo 是否現在打開 .env 文件進行編輯？
    choice /C YN /M "按 Y 打開，按 N 跳過"
    if errorlevel 2 goto END
    if errorlevel 1 (
        notepad .env
        echo.
        echo 請保存 .env 文件後按任意鍵繼續...
        pause >nul
        goto CHECK_ENV
    )
)

:CHECK_FILES
cls
echo ========================================
echo 📂 步驟 2/3: 檢查音樂文件
echo ========================================
echo.

if not exist "public\music" (
    echo ❌ 找不到 public\music 目錄
    echo.
    echo 請確保音樂文件放置在：
    echo public\music\
    echo.
    pause
    goto END
)

echo 掃描音樂文件...
echo.

set /a COUNT=0
for /r "public\music" %%f in (*.mp3) do (
    set /a COUNT+=1
)

if %COUNT%==0 (
    echo ❌ 在 public\music 目錄中找不到任何 .mp3 文件
    echo.
    pause
    goto END
)

echo ✅ 發現 %COUNT% 個音樂文件
echo.

:UPLOAD
cls
echo ========================================
echo 🚀 步驟 3/3: 上傳音樂
echo ========================================
echo.
echo 準備上傳 %COUNT% 個音樂文件到 Netlify Blobs
echo.
echo 預計時間：3-5 分鐘
echo.
echo 是否開始上傳？
choice /C YN /M "按 Y 開始，按 N 取消"
if errorlevel 2 goto END
if errorlevel 1 goto DO_UPLOAD

:DO_UPLOAD
echo.
echo ========================================
echo 開始上傳...
echo ========================================
echo.

REM 執行上傳
call npm run upload-music

echo.
echo ========================================
echo 上傳完成！
echo ========================================
echo.
echo 📍 查看已上傳的音樂：
echo https://app.netlify.com/projects/nuxtkiro20251215/blobs/site:music
echo.
echo 🎵 現在可以在應用中使用音樂庫了！
echo.
pause
goto END

:END
echo.
echo 感謝使用音樂庫設置嚮導！
echo.
pause
