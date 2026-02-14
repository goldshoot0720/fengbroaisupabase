@echo off
chcp 65001 >nul
echo ========================================
echo Upload Videos to Netlify Blobs
echo ========================================
echo.

echo Step 1: Check Netlify CLI status...
netlify status
if %errorlevel% neq 0 (
    echo ERROR: Not logged in or site not linked
    echo Please run: netlify login and netlify link
    pause
    exit /b 1
)
echo SUCCESS: Netlify CLI is configured
echo.

echo Step 2: Start Netlify Dev environment...
echo This will start the local development server with Blobs support
echo Press Ctrl+C to stop when upload is complete
echo.
start /B netlify dev
timeout /t 10 /nobreak >nul

echo Step 3: Upload videos in new window...
echo Opening new command window for upload...
start cmd /k "cd /d %cd% && echo Uploading videos... && node scripts/upload-videos.js && echo Upload complete! Press any key to close... && pause"

echo.
echo ========================================
echo Instructions:
echo 1. Wait for Netlify Dev to start (about 10-15 seconds)
echo 2. The upload will run in the new window
echo 3. Check the upload results
echo 4. Press Ctrl+C here to stop Netlify Dev when done
echo ========================================
pause