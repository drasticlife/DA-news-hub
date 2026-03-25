@echo off
chcp 65001 > nul
echo ===================================================
echo   LME Price Historical Update (10 Years)
echo ===================================================
echo.
echo Installing requirements...
python -m pip install requests --quiet
echo Running Web Scraper in FULL mode... (This will take about 10 minutes)
python scripts\crawl_lme.py --full
echo.
echo Syncing with GitHub...
git add data\lme_prices.json
git diff --staged --quiet
if %errorlevel% neq 0 (
    git commit -m "bot: Auto-update LME FULL history from Local PC"
    git push
    echo DONE!
) else (
    echo No new data found.
)
timeout /t 5 > nul
