@echo off
REM ==============================================================================
REM SDRplay RSP1B Local Launcher for Windows
REM ==============================================================================

echo ==========================================================
echo  SDRplay RSP1B Spectrum Lab - Windows Local Runner
echo ==========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected.

if not exist "node_modules\" (
    echo [*] Installing dependencies (first run only)...
    call npm install
)

echo.
echo ==========================================================
echo  Starting local server on http://localhost:3000
echo  Plug in your RSP1B via USB-C!
echo ==========================================================
echo.

call npm run dev
