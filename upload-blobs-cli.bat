@echo off
chcp 65001 >nul
echo ========================================
echo Upload Videos using Netlify CLI Blobs
echo ========================================
echo.

echo Checking Netlify CLI status...
netlify status
if %errorlevel% neq 0 (
    echo ERROR: Please login and link your site first
    echo Run: netlify login
    echo Run: netlify link
    pause
    exit /b 1
)

echo.
echo Uploading videos to Netlify Blobs...
echo.

echo 1. Uploading: 鋒兄的傳奇人生
netlify blobs:set videos 19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4 public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4
if %errorlevel% equ 0 (
    echo SUCCESS: 鋒兄的傳奇人生 uploaded
) else (
    echo ERROR: Failed to upload 鋒兄的傳奇人生
)

echo.
echo 2. Uploading: 鋒兄進化Show🔥
netlify blobs:set videos clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4 public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4
if %errorlevel% equ 0 (
    echo SUCCESS: 鋒兄進化Show🔥 uploaded
) else (
    echo ERROR: Failed to upload 鋒兄進化Show🔥
)

echo.
echo Verifying uploads...
netlify blobs:list videos

echo.
echo ========================================
echo Upload process completed!
echo Check the list above to verify uploads
echo ========================================
pause