import React, { useState } from 'react';
import {
  X,
  Cpu,
  Monitor,
  Terminal,
  Server,
  Usb,
  Copy,
  Check,
  Download,
  AlertCircle,
  Radio,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { ConnectionState } from '../types/sdr';

interface DeviceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: ConnectionState;
  onConnectTCP: (host: string, port: number) => void;
  onDisconnectTCP: () => void;
  onSelectSimulator: () => void;
  onConnectWebUSB: () => void;
  onOpenRSP1BGuide?: () => void;
}

export const DeviceSetupModal: React.FC<DeviceSetupModalProps> = ({
  isOpen,
  onClose,
  connection,
  onConnectTCP,
  onDisconnectTCP,
  onSelectSimulator,
  onConnectWebUSB,
  onOpenRSP1BGuide,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'arm' | 'linux_x64' | 'windows' | 'webusb'>('connect');
  const [hostInput, setHostInput] = useState('127.0.0.1');
  const [portInput, setPortInput] = useState('1234');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    onConnectTCP(hostInput.trim(), Number(portInput) || 1234);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold font-mono text-white">SDRplay Device &amp; Cross-Platform Hub</h2>
              <p className="text-xs text-slate-400">Windows, Linux, ARM (Raspberry Pi), and x64 Setup</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenRSP1BGuide && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRSP1BGuide();
                }}
                className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 font-mono text-xs font-bold rounded-lg border border-indigo-700/80 transition flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>RSP1B USER GUIDE</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'connect'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Connect Device
          </button>
          <button
            onClick={() => setActiveTab('arm')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'arm'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            Linux ARM / Raspberry Pi
          </button>
          <button
            onClick={() => setActiveTab('linux_x64')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'linux_x64'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            Linux x86_64
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'windows'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            Windows (x64 &amp; ARM)
          </button>
          <button
            onClick={() => setActiveTab('webusb')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'webusb'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4 text-purple-400" />
            WebUSB Direct
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-slate-300 font-sans text-sm space-y-4">
          {/* TAB: CONNECT */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  Live TCP / Network Stream Connector
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Connect to a running <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">sdrplay_tcp</code> or rtl_tcp server running on localhost or anywhere on your local network (e.g. Raspberry Pi running in your radio shack).
                </p>

                <form onSubmit={handleConnect} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">HOST / IP ADDRESS</label>
                    <input
                      type="text"
                      value={hostInput}
                      onChange={(e) => setHostInput(e.target.value)}
                      placeholder="127.0.0.1 or 192.168.1.50"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">TCP PORT</label>
                    <input
                      type="number"
                      value={portInput}
                      onChange={(e) => setPortInput(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-3 pt-2">
                    {connection.connected && connection.mode === 'websocket_tcp' ? (
                      <button
                        type="button"
                        onClick={onDisconnectTCP}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition"
                      >
                        DISCONNECT TCP
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded transition flex items-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        CONNECT TO SDRPLAY TCP
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSimulator();
                        onClose();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded transition"
                    >
                      USE RF SIMULATOR (TEST MODE)
                    </button>
                  </div>
                </form>

                {connection.error && (
                  <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Connection notice: {connection.error}. Check if sdrplay_tcp is running or use RF Simulator.</span>
                  </div>
                )}
              </div>

              {/* Status card */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-400">ACTIVE SOURCE:</div>
                  <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        connection.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {connection.deviceLabel}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400">THROUGHPUT:</div>
                  <div className="text-xs font-mono text-sky-400">
                    {(connection.bytesReceived / (1024 * 1024)).toFixed(2)} MB received
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LINUX ARM (Raspberry Pi) */}
          {activeTab === 'arm' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg text-xs text-emerald-300">
                <strong>Raspberry Pi &amp; ARM Support:</strong> SDRplay officially supports Raspberry Pi 3, 4, 5, and ARM64 / armhf (32-bit &amp; 64-bit OS). Perfect for running a headless SDR receiver connected to your antenna!
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-200">1. Install SDRplay RSP API Service on Raspberry Pi:</h4>
                <div className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 relative border border-slate-800 group">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
{`# 1. Download official SDRplay API v3.x installer from sdrplay.com
# For 64-bit Raspberry Pi OS (aarch64 / arm64):
wget https://www.sdrplay.com/software/SDRplay_RSP_API-ARM64-v3.15.2.run
chmod +x SDRplay_RSP_API-ARM64-v3.15.2.run
sudo ./SDRplay_RSP_API-ARM64-v3.15.2.run

# Start & enable the API background service:
sudo systemctl enable sdrplay
sudo systemctl start sdrplay`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `wget https://www.sdrplay.com/software/SDRplay_RSP_API-ARM64-v3.15.2.run\nchmod +x SDRplay_RSP_API-ARM64-v3.15.2.run\nsudo ./SDRplay_RSP_API-ARM64-v3.15.2.run\nsudo systemctl start sdrplay`,
                        1
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <h4 className="text-xs font-mono font-bold text-slate-200">2. Launch sdrplay_tcp network server:</h4>
                <div className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 relative border border-slate-800">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
{`# Listen on all interfaces (0.0.0.0) so this web app can connect:
sdrplay_tcp -a 0.0.0.0 -p 1234 -f 100000000 -s 2048000`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(`sdrplay_tcp -a 0.0.0.0 -p 1234 -f 100000000 -s 2048000`, 2)
                    }
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                  >
                    {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Once started, switch to the <strong>Connect Device</strong> tab, enter your Raspberry Pi&apos;s IP address (e.g. <code className="text-sky-300">192.168.1.100</code>) and port <code className="text-sky-300">1234</code>, and click Connect!
                </p>
              </div>
            </div>
          )}

          {/* TAB: LINUX X86_64 */}
          {activeTab === 'linux_x64' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300">
                <strong>Linux x86_64 Support:</strong> Compatible with Ubuntu, Debian, Fedora, Arch Linux, Linux Mint, and any standard 64-bit Linux distribution.
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-200">Installation Commands:</h4>
                <div className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 relative border border-slate-800">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
{`# 1. Download SDRplay API v3.x for Linux x86_64:
wget https://www.sdrplay.com/software/SDRplay_RSP_API-Linux-v3.15.2.run
chmod +x SDRplay_RSP_API-Linux-v3.15.2.run
sudo ./SDRplay_RSP_API-Linux-v3.15.2.run

# 2. Verify service is active:
sudo systemctl status sdrplay

# 3. Launch sdrplay_tcp:
sdrplay_tcp -a 127.0.0.1 -p 1234`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `wget https://www.sdrplay.com/software/SDRplay_RSP_API-Linux-v3.15.2.run\nchmod +x SDRplay_RSP_API-Linux-v3.15.2.run\nsudo ./SDRplay_RSP_API-Linux-v3.15.2.run\nsudo systemctl start sdrplay\nsdrplay_tcp -a 127.0.0.1 -p 1234`,
                        3
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                  >
                    {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-950/30 border border-sky-800/60 rounded-lg text-xs text-sky-300">
                <strong>Windows 10 / 11 (x64 and ARM64):</strong> Works natively with SDRplay RSP1, RSP1A, RSPdx, RSPduo, RSP2, and RSPdx-R2.
              </div>

              <div className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                  <li>
                    Download and run the official <strong>SDRplay RSP API v3 Windows Installer</strong> from{' '}
                    <a
                      href="https://www.sdrplay.com/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline inline-flex items-center gap-1"
                    >
                      sdrplay.com/downloads <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    The installer automatically sets up the Windows service <code className="text-sky-300">SDRplay Service</code>.
                  </li>
                  <li>
                    Run <code className="text-sky-300">sdrplay_tcp.exe</code> from PowerShell or Command Prompt:
                  </li>
                </ol>

                <div className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 relative border border-slate-800">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
{`# In PowerShell or cmd.exe:
sdrplay_tcp.exe -a 127.0.0.1 -p 1234 -f 100000000 -s 2048000`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(`sdrplay_tcp.exe -a 127.0.0.1 -p 1234 -f 100000000 -s 2048000`, 4)
                    }
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                  >
                    {copiedIndex === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="pt-2">
                  <a
                    href="/api/scripts/sdrplay_bridge.py"
                    download="sdrplay_bridge.py"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    Download Standalone Python Bridge (sdrplay_bridge.py)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WEBUSB */}
          {activeTab === 'webusb' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-950/30 border border-purple-800/60 rounded-lg text-xs text-purple-300">
                <strong>WebUSB Direct Connection:</strong> Direct in-browser USB hardware interface for supported Chromium browsers (Chrome, Edge, Brave, Opera).
              </div>

              <p className="text-xs text-slate-300">
                Click below to open the browser USB device picker and select your SDRplay (Vendor ID <code className="text-sky-300">0x1df7</code>) or compatible RTL-SDR dongle.
              </p>

              <button
                onClick={onConnectWebUSB}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-2"
              >
                <Usb className="w-4 h-4" />
                CONNECT VIA WEBUSB
              </button>

              <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                <em>Note on Linux/Windows permissions:</em> For direct WebUSB access on Linux, ensure udev rules allow non-root USB access (<code className="text-slate-300">/etc/udev/rules.d/66-mirics.rules</code>). On Windows, WinUSB driver via Zadig is required for raw WebUSB claim.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            SDRplay RSP1 · RSP1A · RSPdx · RSPduo · RSP2 · RSPdx-R2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
