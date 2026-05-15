@echo off
chcp 65001 > nul
setlocal

REM Place this file in: E:\temp\ai_game\LabyrinthOfTheDaimon_git\

set SRC=E:\temp\ai_game\LabyrinthOfTheDaimon
set DST=E:\temp\ai_game\LabyrinthOfTheDaimon_git

echo.
echo ========================================
echo  LabyrinthOfTheDaimon Deploy
echo ========================================
echo.

if not exist "%SRC%" (
    echo [ERROR] Not found: %SRC%
    pause
    exit /b 1
)

echo [1/4] Copying files...
copy /y "%SRC%\index.html"                 "%DST%\" > nul
copy /y "%SRC%\shop_styles.css"            "%DST%\" > nul
copy /y "%SRC%\gamedata.js"                "%DST%\" > nul
copy /y "%SRC%\gamestate.js"               "%DST%\" > nul
copy /y "%SRC%\system_dungeon.js"          "%DST%\" > nul
copy /y "%SRC%\system_char.js"             "%DST%\" > nul
copy /y "%SRC%\system_ui.js"               "%DST%\" > nul
copy /y "%SRC%\system_town.js"             "%DST%\" > nul
copy /y "%SRC%\system_town_common.js"      "%DST%\" > nul
copy /y "%SRC%\system_town_shop.js"        "%DST%\" > nul
copy /y "%SRC%\system_town_smith.js"       "%DST%\" > nul
copy /y "%SRC%\system_town_tavern.js"      "%DST%\" > nul
copy /y "%SRC%\system_town_temple.js"      "%DST%\" > nul
copy /y "%SRC%\system_town_training.js"    "%DST%\" > nul
copy /y "%SRC%\system_town_warehouse.js"   "%DST%\" > nul
copy /y "%SRC%\system_town_church.js"      "%DST%\" > nul
copy /y "%SRC%\system_town_inn.js"         "%DST%\" > nul
copy /y "%SRC%\system_town_gacha.js"       "%DST%\" > nul
copy /y "%SRC%\system_town_outskirts.js"   "%DST%\" > nul
copy /y "%SRC%\system_town_options.js"     "%DST%\" > nul
copy /y "%SRC%\manifest.json"              "%DST%\" > nul
copy /y "%SRC%\sw.js"                      "%DST%\" > nul
copy /y "%SRC%\icon-wizard192.png"         "%DST%\" > nul
copy /y "%SRC%\icon-wizard512.png"         "%DST%\" > nul
copy /y "%SRC%\store_icon.png"             "%DST%\" > nul
echo    Done!
echo.

cd /d "%DST%"

git rm --cached debug.html 2>nul
git rm --cached warehouse_implementation_guide.md 2>nul

echo [2/4] Checking changes...
git add -A
git status

git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo No changes - deploy skipped.
    pause
    exit /b 0
)

echo.
set /p MSG=Commit message (Enter for auto): 
if "%MSG%"=="" set MSG=update: %DATE% %TIME%

echo [3/4] Committing...
git commit -m "%MSG%"

echo [4/4] Pushing...
git push origin main
if errorlevel 1 (
    echo [ERROR] Push failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Deploy Complete!
echo  https://noma0124.github.io/LabyrinthOfTheDaimon/
echo ========================================
echo.
pause
endlocal