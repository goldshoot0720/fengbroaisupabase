@echo off
:: 需要以系統管理員身分執行
:: 將 Nuxt Server 加入 Windows 開機自動啟動 (Task Scheduler)

set TASK_NAME=FengbroaiServer
set PS_SCRIPT=D:\qodercode\fengbroaisupabase-main\start-server.ps1

echo [1/2] 移除同名舊工作...
schtasks /delete /tn "%TASK_NAME%" /f 2>nul

echo [2/2] 建立開機自動啟動工作...
schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%PS_SCRIPT%\"" ^
  /sc onstart ^
  /rl highest ^
  /ru SYSTEM ^
  /f

if %errorlevel% == 0 (
    echo.
    echo 成功！開機時會自動在背景啟動 Nuxt Server。
    echo 工作名稱: %TASK_NAME%
    echo 腳本路徑: %PS_SCRIPT%
    echo.
    echo 注意: 請先執行 "npm run build" 確保 .output 資料夾存在。
) else (
    echo.
    echo 失敗！請確認以系統管理員身分執行此 bat 檔。
)

pause
