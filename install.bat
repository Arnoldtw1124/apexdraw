@echo off
chcp 65001 >nul
title Apex Legends OBS Visual Roulette - Auto Launcher
cls
echo ====================================================================
echo             Apex Legends OBS 隨機英雄與槍械輪盤 - 啟動程式           
echo ====================================================================
echo.
echo 正在啟動 Apex 輪盤本地即時同步伺服器 (Server)...
echo.

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

:: Check if Python is installed and launch server.py
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] 偵測到 Python 環境，正在背景啟動伺服器 server.py (Port 8000)...
    start /b python server.py >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo [!] 未偵測到 Python 環境，將以純網頁相容模式執行 (使用 BroadcastChannel 廣播引擎)。
)

echo.
echo [✓] 正在建立 OBS 快捷捷徑與網頁開啟...
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_PATH%\Apex OBS 輪盤控制台.url"

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=http://localhost:8000/ >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=C:\Windows\System32\shell32.dll >> "%SHORTCUT_PATH%"

echo 捷徑已成功建立於桌面：[Apex OBS 輪盤控制台]
echo.
echo --------------------------------------------------------------------
echo                           【OBS 快速設定說明】
echo.
echo 1. 新增實況圖層 (Overlay):
echo    在 OBS 來源點擊 "+" -> 選擇 "瀏覽器"
echo    網址填寫: http://localhost:8000/?mode=overlay (解析度設定 800x600)
echo.
echo 2. 新增實況主控制面板 (Custom Dock):
echo    點擊 OBS 選單 "停駐視窗 (D)" -> "自訂瀏覽器停駐點..."
echo    名稱輸入: Apex輪盤
echo    URL 輸入: http://localhost:8000/
echo.
echo ====================================================================
echo                     啟動完成！按下任意鍵即可開啟網頁
echo ====================================================================
pause >nul
start "" "http://localhost:8000/"
