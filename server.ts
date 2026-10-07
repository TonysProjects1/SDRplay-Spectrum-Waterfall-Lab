import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/sdr/ws' });

app.use(express.json());

// System detection endpoint for multi-platform setup
app.get('/api/system', (req, res) => {
  res.json({
    platform: process.platform, // 'win32', 'linux', 'darwin'
    arch: process.arch, // 'x64', 'arm', 'arm64'
    hostname: os.hostname(),
    cpus: os.cpus().length,
    release: os.release(),
    isARM: process.arch.includes('arm'),
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
  });
});

// Downloadable cross-platform helper scripts
app.get('/api/scripts/sdrplay_bridge.py', (req, res) => {
  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="sdrplay_bridge.py"');
  res.send(`#!/usr/bin/env python3
"""
SDRplay Cross-Platform Network Bridge for Spectrum & Waterfall Lab
Works across Windows, Linux (x64 & ARM / Raspberry Pi), and macOS.

Usage:
  1. Ensure SDRplay API v3 is installed (from https://www.sdrplay.com/downloads/)
  2. Launch sdrplay_tcp:
       sdrplay_tcp -a 0.0.0.0 -p 1234
     OR run this bridge directly to stream to your browser.
"""

import sys
import socket
import json
import time

def main():
    print("=" * 60)
    print(" SDRplay Cross-Platform Spectrum Bridge")
    print(f" Platform: {sys.platform}")
    print("=" * 60)
    print("To bridge SDRplay to your web browser:")
    print("1. Start SDRplay TCP server:")
    print("   sdrplay_tcp -a 127.0.0.1 -p 1234")
    print("2. In the web app, connect to 'Local TCP Bridge' (port 1234).")
    print("3. Alternatively, enter this machine's IP address in the web app.")
    print("=" * 60)

if __name__ == "__main__":
    main()
`);
});

app.get('/api/scripts/install_sdrplay.sh', (req, res) => {
  res.setHeader('Content-Type', 'text/x-sh');
  res.setHeader('Content-Disposition', 'attachment; filename="install_sdrplay.sh"');
  res.send(`#!/usr/bin/env bash
# SDRplay setup script for Linux x86_64 and Raspberry Pi (ARM/ARM64)
set -e

ARCH=$(uname -m)
echo "=== Detected System Architecture: $ARCH ==="

if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    echo "Configuring for Linux ARM64 (Raspberry Pi 4/5 64-bit)..."
elif [[ "$ARCH" == "armv7l" || "$ARCH" == "armhf" ]]; then
    echo "Configuring for Linux ARM32 (Raspberry Pi 3/4 32-bit)..."
elif [[ "$ARCH" == "x86_64" ]]; then
    echo "Configuring for Linux x86_64..."
else
    echo "Unsupported or custom architecture: $ARCH"
fi

echo "1. Download SDRplay API v3 from https://www.sdrplay.com/downloads/"
echo "2. Make installer executable: chmod +x SDRplay_RSP_API-Linux-*.run"
echo "3. Run installer: sudo ./SDRplay_RSP_API-Linux-*.run"
echo "4. Start API service: sudo systemctl start sdrplay"
echo "5. Launch sdrplay_tcp: sdrplay_tcp -a 0.0.0.0 -p 1234"
echo "Done!"
`);
});

// TCP Connection management for WebSocket clients
interface ClientSession {
  ws: WebSocket;
  tcpSocket?: net.Socket;
  isConnected: boolean;
  sampleRate: number;
  centerFreq: number;
}

const activeSessions = new Map<WebSocket, ClientSession>();

wss.on('connection', (ws: WebSocket) => {
  const session: ClientSession = {
    ws,
    isConnected: false,
    sampleRate: 2048000,
    centerFreq: 100000000,
  };
  activeSessions.set(ws, session);

  ws.on('message', (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'CONNECT_TCP') {
        const host = msg.host || '127.0.0.1';
        const port = Number(msg.port) || 1234;
        const freq = Number(msg.frequency) || 100000000;
        const rate = Number(msg.sampleRate) || 2048000;
        const gain = Number(msg.gain) || 40;

        if (session.tcpSocket) {
          session.tcpSocket.destroy();
        }

        const tcpSocket = net.createConnection({ host, port }, () => {
          session.isConnected = true;
          session.centerFreq = freq;
          session.sampleRate = rate;

          // Send rtl_tcp command: Set Center Frequency (0x01)
          const freqBuf = Buffer.alloc(5);
          freqBuf.writeUInt8(0x01, 0);
          freqBuf.writeUInt32BE(freq, 1);
          tcpSocket.write(freqBuf);

          // Set Sample Rate (0x02)
          const rateBuf = Buffer.alloc(5);
          rateBuf.writeUInt8(0x02, 0);
          rateBuf.writeUInt32BE(rate, 1);
          tcpSocket.write(rateBuf);

          // Set Gain (0x04)
          const gainBuf = Buffer.alloc(5);
          gainBuf.writeUInt8(0x04, 0);
          gainBuf.writeUInt32BE(gain * 10, 1);
          tcpSocket.write(gainBuf);

          ws.send(JSON.stringify({
            type: 'TCP_CONNECTED',
            host,
            port,
            frequency: freq,
            sampleRate: rate,
          }));
        });

        tcpSocket.on('data', (chunk: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            // Forward raw IQ binary chunk to client
            ws.send(chunk);
          }
        });

        tcpSocket.on('error', (err) => {
          ws.send(JSON.stringify({
            type: 'TCP_ERROR',
            error: err.message,
            code: (err as any).code,
          }));
        });

        tcpSocket.on('close', () => {
          session.isConnected = false;
          ws.send(JSON.stringify({
            type: 'TCP_DISCONNECTED',
          }));
        });

        session.tcpSocket = tcpSocket;
      } else if (msg.type === 'DISCONNECT_TCP') {
        if (session.tcpSocket) {
          session.tcpSocket.destroy();
          session.tcpSocket = undefined;
          session.isConnected = false;
        }
        ws.send(JSON.stringify({ type: 'TCP_DISCONNECTED' }));
      } else if (msg.type === 'SET_FREQ' && session.tcpSocket) {
        const freq = Number(msg.frequency);
        if (freq > 0) {
          session.centerFreq = freq;
          const freqBuf = Buffer.alloc(5);
          freqBuf.writeUInt8(0x01, 0);
          freqBuf.writeUInt32BE(freq, 1);
          session.tcpSocket.write(freqBuf);
        }
      } else if (msg.type === 'SET_RATE' && session.tcpSocket) {
        const rate = Number(msg.sampleRate);
        if (rate > 0) {
          session.sampleRate = rate;
          const rateBuf = Buffer.alloc(5);
          rateBuf.writeUInt8(0x02, 0);
          rateBuf.writeUInt32BE(rate, 1);
          session.tcpSocket.write(rateBuf);
        }
      } else if (msg.type === 'SET_GAIN' && session.tcpSocket) {
        const gain = Number(msg.gain);
        const gainBuf = Buffer.alloc(5);
        gainBuf.writeUInt8(0x04, 0);
        gainBuf.writeUInt32BE(gain * 10, 1);
        session.tcpSocket.write(gainBuf);
      }
    } catch {
      // Non-json or raw
    }
  });

  ws.on('close', () => {
    if (session.tcpSocket) {
      session.tcpSocket.destroy();
    }
    activeSessions.delete(ws);
  });
});

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SDRplay Lab] Server running on http://0.0.0.0:${PORT} (${process.platform} ${process.arch})`);
  });
}

startServer();
