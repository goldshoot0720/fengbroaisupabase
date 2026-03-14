@echo off
set APP_DIR=D:\qodercode\fengbroaisupabase-main
set PID_FILE=%APP_DIR%\server.pid

if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    echo 結束程序 PID=%OLD_PID%...
    taskkill /f /pid %OLD_PID% 2>nul
    del "%PID_FILE%"
    echo Server 已停止。
) else (
    echo 找不到 PID 檔，嘗試結束 Port 3000 上的程序...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a 2>nul
        echo 已結束 PID=%%a
    )
)
pause
