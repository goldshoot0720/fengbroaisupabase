@echo off
chcp 65001 >nul
echo ========================================
echo Manual Upload to Netlify Blobs
echo ========================================
echo.

echo Step 1: Get Netlify Site ID...
netlify status > temp_status.txt
for /f "tokens=3" %%i in ('findstr "Site Id:" temp_status.txt') do set SITE_ID=%%i
del temp_status.txt

if "%SITE_ID%"=="" (
    echo ERROR: Could not get Site ID
    echo Please ensure you are logged in and linked to a site
    pause
    exit /b 1
)

echo Site ID: %SITE_ID%
echo.

echo Step 2: Set environment variables...
set NETLIFY_SITE_ID=%SITE_ID%

echo Please provide your Netlify Personal Access Token:
echo (Get it from: https://app.netlify.com/user/applications#personal-access-tokens)
set /p NETLIFY_AUTH_TOKEN="Enter token: "

if "%NETLIFY_AUTH_TOKEN%"=="" (
    echo ERROR: Token is required
    pause
    exit /b 1
)

echo.
echo Step 3: Upload videos...
node scripts/upload-videos-manual.js

echo.
echo Upload process completed!
pause