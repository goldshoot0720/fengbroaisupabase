@echo off
chcp 65001 >nul
echo ========================================
echo Netlify CLI Setup and Video Upload
echo ========================================
echo.

echo 1. Checking Netlify CLI version...
netlify --version
if %errorlevel% neq 0 (
    echo ERROR: Netlify CLI cannot execute
    echo Please check if installation was successful
    pause
    exit /b 1
)
echo SUCCESS: Netlify CLI is installed
echo.

echo 2. Checking login status...
netlify status
if %errorlevel% neq 0 (
    echo WARNING: Not logged in or site not linked
    echo Please run the following commands:
    echo   netlify login
    echo   netlify link
    pause
    exit /b 1
)
echo SUCCESS: Logged in and site linked
echo.

echo 3. Testing Netlify Blobs connection...
node scripts/test-blobs-connection.js
if %errorlevel% neq 0 (
    echo ERROR: Blobs connection test failed
    echo Please check if Blobs feature is enabled
    pause
    exit /b 1
)
echo SUCCESS: Blobs connection test passed
echo.

echo 4. Uploading videos to Netlify Blobs...
node scripts/upload-videos.js
if %errorlevel% neq 0 (
    echo ERROR: Video upload failed
    pause
    exit /b 1
)
echo SUCCESS: Videos uploaded successfully
echo.

echo 5. Verifying upload results...
node scripts/check-blobs.js
echo.

echo ========================================
echo SUCCESS: All steps completed!
echo You can now view videos on your website
echo ========================================
pause