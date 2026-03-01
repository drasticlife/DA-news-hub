@echo off
title DA Wiki Server
cd /d "%~dp0DA-news-wiki"
echo --------------------------------------------------
echo   DA PRODUCT WIKI 서버를 시작합니다...
echo   브라우저에서 http://localhost:8080 접속
echo --------------------------------------------------
npx quartz build --serve
pause
