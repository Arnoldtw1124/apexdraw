@echo off
chcp 65001 >nul
title Apex Legends OBS Visual Roulette - Release Packager
cls
echo ====================================================================
echo               Apex Legends OBS Plugin GitHub Release 打包程式        
echo ====================================================================
echo.
echo 正在打包 GitHub Release 釋出檔...
echo 輸出檔名: Apex-OBS-Roulette-v1.0.0-windows.zip
echo.

set "RELEASE_NAME=Apex-OBS-Roulette-v1.0.0-windows.zip"
set "WORK_DIR=%~dp0"

powershell -Command "
  $destination = '%WORK_DIR%%RELEASE_NAME%';
  if (Test-Path $destination) { Remove-Item $destination -Force }
  $files = Get-ChildItem -Path '%WORK_DIR%' -Exclude '%RELEASE_NAME%', 'build_release.bat', '.git', 'images';
  Compress-Archive -Path $files.FullName -DestinationPath $destination -CompressionLevel Optimal;
  Write-Host 'ZIP Release Package successfully generated at: ' $destination;
"

echo.
echo ====================================================================
echo               GitHub Release 安裝包打包完成！
echo               打包檔案：d:\OBS插件\%RELEASE_NAME%
echo ====================================================================
pause
