@echo off
chcp 65001 > nul
echo ===================================================
echo   LME Price Daily Update Script (Running Locally)
echo ===================================================
echo.

REM 1. Install required python package (requests)
echo 1. Checking Python packages...
python -m pip install requests --quiet
echo.

REM 2. Run Python Crawler
if "%~1"=="--full" (
    echo 2. Running Web Scraper (Full History Mode)...
    python scripts\crawl_lme.py --full
) else (
    echo 2. Running Web Scraper (Daily Update Mode)...
    python scripts\crawl_lme.py
)
echo.

REM 3. Send to GitHub
echo 3. Syncing with GitHub...
git add data\lme_prices.json

git diff --staged --quiet
if %errorlevel% neq 0 (
    git commit -m "bot: Auto-update LME prices from Local PC"
    echo    Pulling latest changes from GitHub...
    git pull --rebase origin main
    if %errorlevel% neq 0 (
        echo ERROR! Conflict occurred during pull. Please resolve manually.
        timeout /t 10 > nul
        exit /b 1
    )
    git push
    if %errorlevel% neq 0 (
        echo ERROR! Push failed. Please check your GitHub connection.
        timeout /t 10 > nul
        exit /b 1
    )
    echo DONE! Successfully updated LME prices to GitHub!
) else (
    echo DONE! No new data found. Everything is up to date.
)
echo.
echo Expected to close in 5 seconds...
timeout /t 5 > nul
