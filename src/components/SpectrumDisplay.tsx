import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Eye, EyeOff, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { FFTSize, WindowFunctionType } from '../types/sdr';

interface SpectrumDisplayProps {
  centerFreqHz: number;
  sampleRateHz: number;
  tunedFreqHz: number;
  filterBandwidthHz: number;
  spectrum: Float32Array;
  avgSpectrum: Float32Array;
  peakSpectrum: Float32Array;
  minDb: number;
  maxDb: number;
  fftSize: FFTSize;
  windowType: WindowFunctionType;
  showAvg: boolean;
  showPeak: boolean;
  onTune: (freqHz: number) => void;
  onSetBandwidth: (bwHz: number) => void;
  onToggleAvg: () => void;
  onTogglePeak: () => void;
  onSnapshot: () => void;
}

export const SpectrumDisplay: React.FC<SpectrumDisplayProps> = ({
  centerFreqHz,
  sampleRateHz,
  tunedFreqHz,
  filterBandwidthHz,
  spectrum,
  avgSpectrum,
  peakSpectrum,
  minDb,
  maxDb,
  showAvg,
  showPeak,
  onTune,
  onToggleAvg,
  onTogglePeak,
  onSnapshot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ freqHz: number; db: number; x: number; y: number } | null>(null);
  const [isDraggingTuner, setIsDraggingTuner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const startFreqHz = centerFreqHz - sampleRateHz / 2;
  const endFreqHz = centerFreqHz + sampleRateHz / 2;

  // Convert frequency to canvas X coordinate
  const freqToX = useCallback(
    (freq: number, width: number) => {
      return ((freq - startFreqHz) / sampleRateHz) * width;
    },
    [startFreqHz, sampleRateHz]
  );

  // Convert canvas X coordinate to frequency
  const xToFreq = useCallback(
    (x: number, width: number) => {
      return startFreqHz + (x / width) * sampleRateHz;
    },
    [startFreqHz, sampleRateHz]
  );

  // Convert dB to canvas Y coordinate
  const dbToY = useCallback(
    (db: number, height: number) => {
      const clamped = Math.max(minDb, Math.min(maxDb, db));
      const normalized = (clamped - minDb) / (maxDb - minDb);
      return height - normalized * height;
    },
    [minDb, maxDb]
  );

  // Convert canvas Y coordinate to dB
  const yToDb = useCallback(
    (y: number, height: number) => {
      const normalized = (height - y) / height;
      return minDb + normalized * (maxDb - minDb);
    },
    [minDb, maxDb]
  );

  // Draw spectrum
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const n = spectrum.length;

    // Clear background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Grid lines for dB
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    const dbStep = (maxDb - minDb) > 80 ? 20 : 10;
    const firstDb = Math.ceil(minDb / dbStep) * dbStep;

    for (let db = firstDb; db <= maxDb; db += dbStep) {
      const y = dbToY(db, height);
      ctx.strokeStyle = db === -60 || db === -40 ? 'rgba(74, 107, 130, 0.35)' : 'rgba(51, 65, 85, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.fillText(`${db} dBm`, width - 8, y - 3);
    }

    // Grid lines for Frequency
    const visibleBwMhz = sampleRateHz / 1e6;
    let freqStepMhz = 0.5;
    if (visibleBwMhz <= 0.5) freqStepMhz = 0.05;
    else if (visibleBwMhz <= 1.5) freqStepMhz = 0.1;
    else if (visibleBwMhz <= 3.0) freqStepMhz = 0.25;
    else if (visibleBwMhz <= 8.0) freqStepMhz = 0.5;
    else freqStepMhz = 1.0;

    const freqStepHz = freqStepMhz * 1e6;
    const firstFreqHz = Math.ceil(startFreqHz / freqStepHz) * freqStepHz;

    ctx.textAlign = 'center';
    for (let f = firstFreqHz; f <= endFreqHz; f += freqStepHz) {
      const x = freqToX(f, width);
      const isCenter = Math.abs(f - centerFreqHz) < 1000;

      ctx.strokeStyle = isCenter ? 'rgba(56, 189, 248, 0.4)' : 'rgba(51, 65, 85, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = isCenter ? '#38bdf8' : 'rgba(148, 163, 184, 0.6)';
      ctx.fillText(`${(f / 1e6).toFixed(3)}`, x, height - 6);
    }

    // VFO Tuned Frequency filter bandwidth overlay
    const tunerX = freqToX(tunedFreqHz, width);
    const halfBwX = (filterBandwidthHz / sampleRateHz) * width / 2;
    const leftPassX = Math.max(0, tunerX - halfBwX);
    const rightPassX = Math.min(width, tunerX + halfBwX);
    const passWidth = rightPassX - leftPassX;

    // Filter passband box
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.fillRect(leftPassX, 0, passWidth, height);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftPassX, 0, passWidth, height);

    // VFO Center line (Red marker)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tunerX, 0);
    ctx.lineTo(tunerX, height);
    ctx.stroke();

    // VFO indicator flag at top
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(tunerX - 6, 0);
    ctx.lineTo(tunerX + 6, 0);
    ctx.lineTo(tunerX, 10);
    ctx.closePath();
    ctx.fill();

    // DC LO center marker (Sky blue dotted)
    const loX = freqToX(centerFreqHz, width);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(loX, 0);
    ctx.lineTo(loX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Peak Hold trace if enabled
    if (showPeak && peakSpectrum && peakSpectrum.length === n) {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * width;
        const y = dbToY(peakSpectrum[i], height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Draw Average trace if enabled
    if (showAvg && avgSpectrum && avgSpectrum.length === n) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * width;
        const y = dbToY(avgSpectrum[i], height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Draw Main Real-Time Spectrum Trace with neon gradient fill
    if (spectrum && spectrum.length === n) {
      // Create gradient under curve
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.08)');
      grad.addColorStop(1, 'rgba(8, 12, 20, 0.0)');

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * width;
        const y = dbToY(spectrum[i], height);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Main outline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * width;
        const y = dbToY(spectrum[i], height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Hover crosshair and tooltip
    if (hoverInfo) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, 0);
      ctx.lineTo(hoverInfo.x, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverInfo.y);
      ctx.lineTo(width, hoverInfo.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip box
      const text = `${(hoverInfo.freqHz / 1e6).toFixed(4)} MHz | ${hoverInfo.db.toFixed(1)} dBm`;
      ctx.font = '11px monospace';
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 16;
      const boxH = 22;
      const boxX = Math.min(width - boxW - 8, Math.max(8, hoverInfo.x - boxW / 2));
      const boxY = Math.max(10, hoverInfo.y - 32);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.fillText(text, boxX + 8, boxY + 15);
    }
  }, [
    spectrum,
    avgSpectrum,
    peakSpectrum,
    minDb,
    maxDb,
    centerFreqHz,
    sampleRateHz,
    tunedFreqHz,
    filterBandwidthHz,
    showAvg,
    showPeak,
    hoverInfo,
    dbToY,
    freqToX,
    startFreqHz,
    endFreqHz,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse interactions for tuning and inspection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const freq = xToFreq(x, rect.width);
    onTune(Math.round(freq));
    setIsDraggingTuner(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const freq = xToFreq(x, rect.width);
    const db = yToDb(y, rect.height);

    setHoverInfo({ freqHz: freq, db, x, y });

    if (isDraggingTuner) {
      onTune(Math.round(freq));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTuner(false);
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
    setIsDraggingTuner(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden select-none"
      style={{ minHeight: '180px' }}
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-950/80 text-sky-400 border border-sky-800/60 backdrop-blur">
            RF SPECTRUM
          </span>
          <span className="text-xs font-mono text-slate-400 backdrop-blur bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
            SPAN: {(sampleRateHz / 1e6).toFixed(3)} MHz
          </span>
          <span className="text-xs font-mono text-slate-400 backdrop-blur bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 hidden sm:inline">
            CENTER: {(centerFreqHz / 1e6).toFixed(4)} MHz
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded p-1">
          <button
            onClick={onToggleAvg}
            title={showAvg ? 'Hide Average Spectrum' : 'Show Average Spectrum'}
            className={`px-2 py-0.5 text-xs font-mono rounded transition flex items-center gap-1 ${
              showAvg ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AVG
          </button>
          <button
            onClick={onTogglePeak}
            title={showPeak ? 'Hide Peak Hold' : 'Show Peak Hold'}
            className={`px-2 py-0.5 text-xs font-mono rounded transition flex items-center gap-1 ${
              showPeak ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PEAK
          </button>
          <button
            onClick={onSnapshot}
            title="Export Spectrum Snapshot (PNG)"
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition hover:bg-slate-800"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition hover:bg-slate-800"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full cursor-crosshair block"
      />
    </div>
  );
};
