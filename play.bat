@echo off
setlocal enabledelayedexpansion

:: Force working directory to the directory containing this batch file
cd /d "%~dp0"

title 14th-Century Subcontinent Grand Strategy Game Launcher
color 0E

echo ==============================================================================
echo   1345 CE: THE GREAT FRACTURE - TOTAL WAR GRAND STRATEGY (INDIA)
echo ==============================================================================
echo.

:: 1. Locate Node.js executable
set "NODE_CMD="

where node >nul 2>nul
if %ERRORLEVEL% equ 0 set "NODE_CMD=node"
if "%NODE_CMD%"=="" if exist "C:\Program Files\nodejs\node.exe" set "NODE_CMD=C:\Program Files\nodejs\node.exe"
if "%NODE_CMD%"=="" if exist "C:\Program Files (x86)\nodejs\node.exe" set "NODE_CMD=C:\Program Files (x86)\nodejs\node.exe"
if "%NODE_CMD%"=="" if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"

if not "%NODE_CMD%"=="" goto :node_found

color 0C
echo [ERROR] Node.js was not detected on this system!
echo Node.js is required to run the local server and persist your game saves.
echo Please install Node.js LTS from: https://nodejs.org/
echo After installing Node.js, run play.bat again.
echo ==============================================================================
pause
exit /b 1

:node_found
echo [OK] Node.js runtime detected: %NODE_CMD%
echo [OK] Launching game server and standalone window...
echo.
echo ==============================================================================
echo   The game window will open automatically in a few moments.
echo   Keep this console window open while playing to allow saving to disk.
echo   Press Ctrl+C or close this window when you wish to stop the game.
echo ==============================================================================
echo.

"%NODE_CMD%" server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTICE] Server process ended with exit code %ERRORLEVEL%.
    pause
)
