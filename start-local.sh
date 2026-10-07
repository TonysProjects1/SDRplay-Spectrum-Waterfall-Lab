#!/usr/bin/env bash
# ==============================================================================
# SDRplay RSP1B Local Launcher & Spectrum Lab Runner
# Works across Linux x86_64 and Raspberry Pi (ARM64 / ARM32)
# ==============================================================================

set -e

echo "=========================================================="
echo " SDRplay RSP1B Spectrum & Waterfall Lab - Local Runner"
echo "=========================================================="

ARCH=$(uname -m)
echo "System Architecture: $ARCH"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "[✓] Node.js version: $(node -v)"

# 2. Check SDRplay API service status
if systemctl is-active --quiet sdrplay 2>/dev/null; then
    echo "[✓] SDRplay API Service (sdrplay.service) is RUNNING."
else
    echo "[!] SDRplay API Service is not currently active."
    echo "    If you have installed SDRplay API v3, start it with:"
    echo "    sudo systemctl start sdrplay"
    echo "    (If not yet installed, download from https://www.sdrplay.com/downloads/)"
fi

# 3. Check for sdrplay_tcp binary
if command -v sdrplay_tcp &> /dev/null; then
    echo "[✓] sdrplay_tcp binary found in PATH."
else
    echo "[i] sdrplay_tcp not found in PATH (you can also use the RF Simulator or Python bridge)."
fi

# 4. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "[*] Installing app dependencies..."
    npm install
fi

echo ""
echo "=========================================================="
echo " Starting Local Server on http://localhost:3000 ..."
echo " Open your web browser to http://localhost:3000"
echo "=========================================================="
echo ""

npm run dev
