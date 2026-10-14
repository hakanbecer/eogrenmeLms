@echo off
title E-Ogrenme Icerik Gelistirici
cd /d "%~dp0"
echo ====================================================================
echo   E-Ogrenme Icerik Gelistirici (Authoring Tool)
echo   Sunucu Baslatiliyor: http://localhost:5180
echo ====================================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5180
npm run dev
pause
