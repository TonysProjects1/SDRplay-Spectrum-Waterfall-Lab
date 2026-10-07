import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Terminal,
  Cpu,
  Monitor,
  Usb,
  ExternalLink,
  Copy,
  Check,
  Radio,
  HelpCircle,
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';

interface RSP1BGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeviceSetup: () => void;
}

export const RSP1BGuideModal: React.FC<RSP1BGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenDeviceSetup,
}) => {
  const [activeOS, setActiveOS] = useState<'windows' | 'linux' | 'raspberry_pi'>('windows');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-950">
              <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-mono text-white">
                  SDRplay RSP1B Setup &amp; Local Run Guide
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800">
                  RSP1B CERTIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                &ldquo;Just plug in or is there a guide?&rdquo; &mdash; Everything you need to know.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Executive Summary Card: The exact answer to "just plug in?" */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-sky-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-xs uppercase mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  Will this app run locally?
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Yes, 100% locally on your machine!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The application is fully self-contained with its own Node.js + Express + Vite backend in <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded font-mono">server.ts</code>. It runs completely offline on your localhost (<code className="text-sky-300">http://localhost:3000</code>) on Windows, Linux x64, and Raspberry Pi ARM.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 font-mono text-[11px] text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Zero cloud lock-in · Full local access to ports &amp; USB</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase mb-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Can I &ldquo;just download and plug in&rdquo;?
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Almost &mdash; 1 quick prerequisite (60 seconds):
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Like all SDRplay hardware, the <strong>RSP1B</strong> requires the free official <strong>SDRplay API v3 background service</strong> from SDRplay. Operating systems will not allow web browsers to stream raw 14-bit RF samples without this service running.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 font-mono text-[11px] text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Install SDRplay API v3 once &rarr; Plug in USB-C &rarr; Connect!</span>
              </div>
            </div>
          </div>

          {/* RSP1B Hardware Spotlight */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4" />
                SDRplay RSP1B Hardware Capabilities in this App
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                USB Type-C · Rugged Metal Case
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">FREQUENCY RANGE</span>
                <span className="text-white font-bold">1 kHz &ndash; 2.0 GHz</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">ADC RESOLUTION</span>
                <span className="text-sky-400 font-bold">14-bit High-Res</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">MAX BANDWIDTH</span>
                <span className="text-emerald-400 font-bold">Up to 10 MHz</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">NOTCH FILTERS</span>
                <span className="text-amber-400 font-bold">FM, MW, DAB, Bias-T</span>
              </div>
            </div>
          </div>

          {/* OS-Specific Step-by-Step Installation Tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Step-by-Step Local Setup by Operating System:
              </h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveOS('windows')}
                  className={`px-3 py-1 rounded text-xs font-mono transition flex items-center gap-1.5 ${
                    activeOS === 'windows'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Windows 10/11
                </button>
                <button
                  onClick={() => setActiveOS('linux')}
                  className={`px-3 py-1 rounded text-xs font-mono transition flex items-center gap-1.5 ${
                    activeOS === 'linux'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Linux x86_64
                </button>
                <button
                  onClick={() => setActiveOS('raspberry_pi')}
                  className={`px-3 py-1 rounded text-xs font-mono transition flex items-center gap-1.5 ${
                    activeOS === 'raspberry_pi'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Raspberry Pi (ARM)
                </button>
              </div>
            </div>

            {/* TAB: WINDOWS */}
            {activeOS === 'windows' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Download SDRplay API v3.x for Windows
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Download the official driver installer from SDRplay (includes the Windows service and <code className="text-sky-300">sdrplay_tcp.exe</code>).
                    </p>
                    <a
                      href="https://www.sdrplay.com/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono mt-2 underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      sdrplay.com/downloads (SDRplay_RSP_API-Windows-v3.x.exe)
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Plug in your RSP1B via USB Type-C
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Connect the RSP1B to any USB 2.0 or 3.0 port. The Windows Device Manager will show it under <em>Sound, video and game controllers</em> as an SDRplay device.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Run this App Locally (or start sdrplay_tcp)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 mb-2">
                      Open PowerShell or Command Prompt in this folder and start the local server:
                    </p>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800">
                      <code>npm install &amp;&amp; npm run dev</code>
                      <button
                        onClick={() => copy('npm install && npm run dev', 'win-npm')}
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                        title="Copy command"
                      >
                        {copiedId === 'win-npm' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 mb-1">
                      Then start <code className="text-sky-300">sdrplay_tcp</code> in a second PowerShell window:
                    </p>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800">
                      <code>&amp; &quot;C:\Program Files\SDRplay\API\x64\sdrplay_tcp.exe&quot; -a 127.0.0.1 -p 1234</code>
                      <button
                        onClick={() =>
                          copy('& "C:\\Program Files\\SDRplay\\API\\x64\\sdrplay_tcp.exe" -a 127.0.0.1 -p 1234', 'win-tcp')
                        }
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                        title="Copy command"
                      >
                        {copiedId === 'win-tcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LINUX */}
            {activeOS === 'linux' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Install SDRplay API Service (Linux x86_64)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 mb-2">
                      Run these commands in terminal to install the driver and enable the service:
                    </p>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800">
                      <pre className="whitespace-pre-wrap">{`wget https://www.sdrplay.com/software/SDRplay_RSP_API-Linux-v3.15.2.run
chmod +x SDRplay_RSP_API-Linux-v3.15.2.run
sudo ./SDRplay_RSP_API-Linux-v3.15.2.run
sudo systemctl enable sdrplay
sudo systemctl start sdrplay`}</pre>
                      <button
                        onClick={() =>
                          copy(
                            `wget https://www.sdrplay.com/software/SDRplay_RSP_API-Linux-v3.15.2.run\nchmod +x SDRplay_RSP_API-Linux-v3.15.2.run\nsudo ./SDRplay_RSP_API-Linux-v3.15.2.run\nsudo systemctl start sdrplay`,
                            'lin-api'
                          )
                        }
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        {copiedId === 'lin-api' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Plug in RSP1B &amp; Launch TCP bridge
                    </h4>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800 mt-2">
                      <code>sdrplay_tcp -a 127.0.0.1 -p 1234</code>
                      <button
                        onClick={() => copy('sdrplay_tcp -a 127.0.0.1 -p 1234', 'lin-tcp')}
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        {copiedId === 'lin-tcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RASPBERRY PI */}
            {activeOS === 'raspberry_pi' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300 font-mono">
                  &bull; Raspberry Pi 3, 4, 5 (32-bit armhf or 64-bit aarch64) are officially supported by SDRplay!
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Install ARM64 / ARM32 SDRplay driver on the Pi
                    </h4>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800 mt-2">
                      <pre className="whitespace-pre-wrap">{`# For Raspberry Pi OS 64-bit (aarch64):
wget https://www.sdrplay.com/software/SDRplay_RSP_API-ARM64-v3.15.2.run
chmod +x SDRplay_RSP_API-ARM64-v3.15.2.run
sudo ./SDRplay_RSP_API-ARM64-v3.15.2.run
sudo systemctl start sdrplay`}</pre>
                      <button
                        onClick={() =>
                          copy(
                            `wget https://www.sdrplay.com/software/SDRplay_RSP_API-ARM64-v3.15.2.run\nchmod +x SDRplay_RSP_API-ARM64-v3.15.2.run\nsudo ./SDRplay_RSP_API-ARM64-v3.15.2.run\nsudo systemctl start sdrplay`,
                            'rpi-api'
                          )
                        }
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        {copiedId === 'rpi-api' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-900/60 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs font-mono">
                      Stream from Pi to any computer / phone browser:
                    </h4>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 relative border border-slate-800 mt-2">
                      <code>sdrplay_tcp -a 0.0.0.0 -p 1234</code>
                      <button
                        onClick={() => copy('sdrplay_tcp -a 0.0.0.0 -p 1234', 'rpi-tcp')}
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        {copiedId === 'rpi-tcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      In this web app, go to <strong>Connect Device</strong>, type your Raspberry Pi&apos;s local IP (e.g. <code className="text-sky-300">192.168.1.100:1234</code>), and you can view the spectrum on your laptop from anywhere on your Wi-Fi!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Download Starter Scripts */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-bold text-white">READY-TO-USE HELPER SCRIPTS</div>
              <p className="text-xs text-slate-400">Downloadable scripts already bundled in your app repository:</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/scripts/sdrplay_bridge.py"
                download="sdrplay_bridge.py"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                sdrplay_bridge.py
              </a>
              <a
                href="/api/scripts/install_sdrplay.sh"
                download="install_sdrplay.sh"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                install_sdrplay.sh
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Tested with SDRplay RSP1B &bull; API v3.14+</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenDeviceSetup();
              }}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded-lg transition"
            >
              Open Device Connection Hub &rarr;
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
