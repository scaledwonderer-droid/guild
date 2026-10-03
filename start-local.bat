@echo off
setlocal
cd /d "%~dp0"

set "PORT=8765"
set "GAME_URL=http://127.0.0.1:%PORT%/"

where powershell.exe >nul 2>nul
if errorlevel 1 goto no_powershell

start "Ashen Crown Local Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0local-server.ps1" -Port %PORT%

echo ローカルサーバーの起動を確認しています...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(20); do { try { $response=Invoke-WebRequest -UseBasicParsing -Uri '%GAME_URL%' -TimeoutSec 2; if ($response.StatusCode -eq 200 -and $response.Content.Contains('src/main.js')) { exit 0 } } catch { }; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if errorlevel 1 goto server_failed

echo サーバーが起動しました。ブラウザを開きます。
start "" "%GAME_URL%"
echo 終了するときは "Ashen Crown Local Server" ウィンドウで Ctrl+C を押してください。
exit /b 0

:no_powershell
echo Windows PowerShell が見つかりません。
echo Pythonは不要ですが、Windows PowerShell 5.1以降が必要です。
pause
exit /b 1

:server_failed
echo サーバーの起動を確認できませんでした。ブラウザは開いていません。
echo "Ashen Crown Local Server" ウィンドウに表示されたエラーを確認してください。
echo ポート %PORT% が使用中の場合は、使用中のアプリを終了してから再実行してください。
pause
exit /b 1
