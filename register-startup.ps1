$TaskName  = "FengbroaiServer"
$PsScript  = "D:\qodercode\fengbroaisupabase-main\start-server.ps1"
$TaskAction = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PsScript`""

Write-Host "[1/2] 移除同名舊工作..."
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "[2/2] 建立開機自動啟動工作..."
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PsScript`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Host ""
    Write-Host "成功！開機時會自動在背景啟動 Nuxt Server。" -ForegroundColor Green
    Write-Host "工作名稱: $TaskName"
    Write-Host "腳本路徑: $PsScript"
    Write-Host "狀態: $($task.State)"
} else {
    Write-Host "失敗！請確認以系統管理員身分執行。" -ForegroundColor Red
}
