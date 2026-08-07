@echo off
chcp 65001 >nul
title Apex Legends OBS Visual Roulette - Installer
cls
echo ====================================================================
echo             Apex Legends OBS 隨機英雄與槍械輪盤 - 安裝程式           
echo ====================================================================
echo.
echo 正在準備安裝檔與 OBS Studio 設定...
echo 本套件包含：
echo   - 60 FPS 橫向英雄卡片選單 (Hero Selector Reel)
echo   - 槍械輪盤 (Weapon Roulette)
echo   - 內建 28 位英雄 AVIF 精美角色圖庫
echo   - OBS 透明圖層 (Overlay Mode) 支援
echo.
echo --------------------------------------------------------------------
echo [1] 正在檢查本機安裝檔案目錄...
set "INSTALL_DIR=%~dp0"
echo 安裝目錄: %INSTALL_DIR%
echo.

echo [2] 正在建立 OBS 快捷捷徑...
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_PATH%\Apex OBS 輪盤控制台.url"

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=file:///%INSTALL_DIR:\=/%index.html >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=C:\Windows\System32\shell32.dll >> "%SHORTCUT_PATH%"

echo 捷徑已成功建立於桌面：[Apex OBS 輪盤控制台]
echo.

echo --------------------------------------------------------------------
echo                           【OBS 快速設定說明】
echo.
echo 1. 新增實況圖層 (Overlay):
echo    在 OBS 來源點擊 "+" -> 選擇 "瀏覽器"
echo    勾選 "本機檔案" 選擇：
echo    %INSTALL_DIR%index.html
echo    並在 URL 後方加上 ?mode=overlay (解析度設定 1280x720)
echo.
echo 2. 新增實況主控制面板 (Custom Dock):
echo    點擊 OBS 選單 "檢視" -> "動態分頁 (Docks)" -> "自訂瀏覽器 Dock..."
echo    名稱輸入: Apex輪盤
echo    URL 輸入: file:///%INSTALL_DIR:\=/%index.html
echo.
echo ====================================================================
echo                     安裝完成！按下任意鍵即可開啟網頁預覽
echo ====================================================================
pause >nul
start "" "%INSTALL_DIR%index.html"
