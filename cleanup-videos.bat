@echo off
chcp 65001 >nul
echo ========================================
echo Cleanup Local Video Files
echo ========================================
echo.

echo Videos are now successfully uploaded to Netlify Blobs!
echo You can safely remove them from public/videos to reduce repository size.
echo.

echo Current video files in public/videos:
dir public\videos\*.mp4

echo.
echo Do you want to delete these local video files? (Y/N)
set /p choice="Enter your choice: "

if /i "%choice%"=="Y" (
    echo.
    echo Deleting video files...
    del public\videos\*.mp4
    echo SUCCESS: Video files deleted from public/videos
    echo.
    echo Remaining files in public/videos:
    dir public\videos
) else (
    echo.
    echo Video files kept in public/videos (backup)
)

echo.
echo ========================================
echo Cleanup completed!
echo Videos will now load from Netlify Blobs
echo ========================================
pause