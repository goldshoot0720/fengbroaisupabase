# 鋒兄 AI - 背景啟動腳本
$APP_DIR  = "D:\qodercode\fengbroaisupabase-main"
$APP_PORT = 3000
$PID_FILE = "$APP_DIR\server.pid"
$LOG_FILE = "$APP_DIR\server.log"

# --- 1. 結束舊程序 (PID 檔) ---
if (Test-Path $PID_FILE) {
    $oldPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
    if ($oldPid) {
        $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "結束舊程序 PID=$oldPid ..."
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
}

# --- 2. 結束占用同一 Port 的程序 ---
$portProcs = netstat -ano | Select-String ":$APP_PORT\s" | Select-String "LISTENING"
foreach ($line in $portProcs) {
    $parts = $line.ToString().Trim() -split '\s+'
    $pid2  = $parts[-1]
    if ($pid2 -match '^\d+$') {
        Write-Host "結束占用 Port $APP_PORT 的程序 PID=$pid2 ..."
        Stop-Process -Id $pid2 -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

# --- 3. 確認 build 已存在 ---
$serverEntry = "$APP_DIR\.netlify\functions-internal\server\main.mjs"
if (-not (Test-Path $serverEntry)) {
    Write-Host "找不到 $serverEntry，請先執行 npm run build" -ForegroundColor Red
    exit 1
}

# --- 4. 背景啟動 Nuxt server (nuxt preview) ---
Write-Host "啟動 Nuxt server (port $APP_PORT)..."
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName        = "cmd"
$startInfo.Arguments       = "/c npm run preview"
$startInfo.WorkingDirectory = $APP_DIR
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow  = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError  = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $startInfo

# 非同步寫入 log
$proc.EnableRaisingEvents = $true
Register-ObjectEvent -InputObject $proc -EventName "OutputDataReceived" -Action {
    if ($Event.SourceEventArgs.Data) {
        Add-Content -Path $LOG_FILE -Value $Event.SourceEventArgs.Data
    }
} | Out-Null
Register-ObjectEvent -InputObject $proc -EventName "ErrorDataReceived" -Action {
    if ($Event.SourceEventArgs.Data) {
        Add-Content -Path $LOG_FILE -Value $Event.SourceEventArgs.Data
    }
} | Out-Null

$proc.Start() | Out-Null
$proc.BeginOutputReadLine()
$proc.BeginErrorReadLine()

# --- 5. 儲存 PID ---
$proc.Id | Out-File $PID_FILE -Encoding ASCII
Write-Host "Server 已在背景啟動，PID=$($proc.Id)，Log: $LOG_FILE"
