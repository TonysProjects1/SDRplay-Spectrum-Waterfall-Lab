import React from 'react';
import {
  Radio,
  Server,
  HardDrive,
  BookOpen,
  Cpu,
  Layers,
  Settings,
  Disc,
} from 'lucide-react';
import { ConnectionState, FFTSize, RFMetrics } from '../types/sdr';

interface HeaderProps {
  connection: ConnectionState;
  metrics: RFMetrics;
  sampleRateHz: number;
  fftSize: FFTSize;
  isRecording: boolean;
  onOpenDeviceSetup: () => void;
  onOpenRecording: () => void;
  onOpenBandPlan: () => void;
  onOpenRSP1BGuide: () => void;
  onSetSampleRate: (rate: number) => void;
  onSetFFTSize: (size: FFTSize) => void;
}

const SAMPLE_RATES = [
  { label: '250 kHz', value: 250000 },
  { label: '1.024 MHz', value: 1024000 },
  { label: '1.536 MHz', value: 1536000 },
  { label: '2.048 MHz', value: 2048000 },
  { label: '6.000 MHz', value: 6000000 },
  { label: '8.000 MHz', value: 8000000 },
];

const FFT_SIZES: FFTSize[] = [512, 1024, 2048, 4096];

export const Header: React.FC<HeaderProps> = ({
  connection,
  metrics,
  sampleRateHz,
  fftSize,
  isRecording,
  onOpenDeviceSetup,
  onOpenRecording,
  onOpenBandPlan,
  onOpenRSP1BGuide,
  onSetSampleRate,
  onSetFFTSize,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* Brand & Connection Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-950">
            <Radio className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-white tracking-tight flex items-center gap-1.5">
              SDRplay Spectrum Lab
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/80">
                MULTI-ARCH
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Win · Linux · ARM (RPi) · x64
            </p>
          </div>
        </div>

        {/* Connection status pill */}
        <button
          onClick={onOpenDeviceSetup}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition ${
            connection.connected
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/60'
              : 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/40'
          }`}
          title="Click to configure SDRplay device & network bridge"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connection.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="truncate max-w-[130px]">{connection.deviceLabel}</span>
        </button>

        {/* RSP1B Quick Start & Local Run Guide button */}
        <button
          onClick={onOpenRSP1BGuide}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 transition shadow-sm"
          title="RSP1B Installation Guide & Local Run Instructions"
        >
          <Radio className="w-3.5 h-3.5 text-indigo-400" />
          <span>RSP1B GUIDE</span>
        </button>
      </div>

      {/* RF Live Signal Metrics Telemetry */}
      <div className="hidden lg:flex items-center gap-4 bg-slate-950/70 border border-slate-800/80 rounded-md px-3 py-1 font-mono text-xs">
        <div>
          <span className="text-slate-500 text-[10px] block">RSSI</span>
          <span className="text-sky-400 font-bold">{metrics.rssiDb.toFixed(1)} dBm</span>
        </div>
        <div className="w-px h-5 bg-slate-800" />
        <div>
          <span className="text-slate-500 text-[10px] block">SNR</span>
          <span className="text-emerald-400 font-bold">{metrics.snrDb.toFixed(1)} dB</span>
        </div>
        <div className="w-px h-5 bg-slate-800" />
        <div>
          <span className="text-slate-500 text-[10px] block">PEAK PWR</span>
          <span className="text-rose-400 font-bold">{metrics.peakPowerDb.toFixed(1)} dBm</span>
        </div>
        <div className="w-px h-5 bg-slate-800" />
        <div>
          <span className="text-slate-500 text-[10px] block">PEAK FREQ</span>
          <span className="text-slate-200">{(metrics.peakFreqHz / 1e6).toFixed(3)} MHz</span>
        </div>
      </div>

      {/* Top Controls & Navigation */}
      <div className="flex items-center gap-2">
        {/* Sample Rate Selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono">
          <span className="text-slate-500 text-[10px] uppercase">SRATE:</span>
          <select
            value={sampleRateHz}
            onChange={(e) => onSetSampleRate(Number(e.target.value))}
            className="bg-transparent text-slate-200 text-xs font-mono outline-none cursor-pointer"
          >
            {SAMPLE_RATES.map((r) => (
              <option key={r.value} value={r.value} className="bg-slate-900 text-slate-200">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* FFT Size Selector */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono">
          <span className="text-slate-500 text-[10px] uppercase">FFT:</span>
          <select
            value={fftSize}
            onChange={(e) => onSetFFTSize(Number(e.target.value) as FFTSize)}
            className="bg-transparent text-slate-200 text-xs font-mono outline-none cursor-pointer"
          >
            {FFT_SIZES.map((sz) => (
              <option key={sz} value={sz} className="bg-slate-900 text-slate-200">
                {sz}
              </option>
            ))}
          </select>
        </div>

        {/* Band Plan button */}
        <button
          onClick={onOpenBandPlan}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition"
          title="Browse Band Plans and Bookmarks"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">BANDS</span>
        </button>

        {/* Recording Drawer Toggle */}
        <button
          onClick={onOpenRecording}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition ${
            isRecording
              ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Open RF Capture & Recording Suite"
        >
          <Disc className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-500 fill-rose-500' : 'text-rose-400'}`} />
          <span className="hidden sm:inline">CAPTURE</span>
        </button>

        {/* Device Setup modal toggle */}
        <button
          onClick={onOpenDeviceSetup}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
          title="Open Cross-Platform Setup & Bridge Hub"
        >
          <Settings className="w-4 h-4 text-sky-400" />
        </button>
      </div>
    </header>
  );
};
