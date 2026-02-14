@echo off
chcp 65001 >nul
echo ========================================
echo Netlify Login and Link Setup
echo ========================================
echo.

echo Step 1: Checking Netlify CLI...
netlify --version
if %errorlevel% neq 0 (
    echo ERROR: Netlify CLI cannot execute
    echo Please ensure Netlify CLI is properly installed
    pause
    exit /b 1
)
echo SUCCESS: Netlify CLI is available
echo.

echo Step 2: Login to Netlify...
echo This will open a browser, please login to your Netlify account
netlify login
if %errorlevel% neq 0 (
    echo ERROR: Login failed
    pause
    exit /b 1
)
echo SUCCESS: Login completed
echo.

echo Step 3: Link project to Netlify site...
echo Please select your site or create a new one
netlify link
if %errorlevel% neq 0 (
    echo ERROR: Link failed
    pause
    exit /b 1
)
echo SUCCESS: Project linked successfully
echo.

echo Step 4: Checking status...
netlify status
echo.

echo ========================================
echo SUCCESS: Netlify configuration completed!
echo Now you can run setup-netlify-en.bat to upload videos
echo ========================================
pause