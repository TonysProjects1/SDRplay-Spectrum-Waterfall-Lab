import React, { useRef, useEffect, useCallback } from 'react';
import { ColorMapName } from '../types/sdr';
import { getColorLUT } from '../dsp/colormaps';

interface WaterfallDisplayProps {
  centerFreqHz: number;
  sampleRateHz: number;
  tunedFreqHz: number;
  filterBandwidthHz: number;
  spectrum: Float32Array;
  minDb: number;
  maxDb: number;
  colorMap: ColorMapName;
  waterfallSpeed: number; // 1 to 5 lines per frame
  onTune: (freqHz: number) => void;
  onSetColorMap: (map: ColorMapName) => void;
  onSetMinDb: (val: number) => void;
  onSetMaxDb: (val: number) => void;
}

export const WaterfallDisplay: React.FC<WaterfallDisplayProps> = ({
  centerFreqHz,
  sampleRateHz,
  tunedFreqHz,
  filterBandwidthHz,
  spectrum,
  minDb,
  maxDb,
  colorMap,
  waterfallSpeed,
  onTune,
  onSetColorMap,
  onSetMinDb,
  onSetMaxDb,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Secondary canvas used as off-screen scroll buffer
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const startFreqHz = centerFreqHz - sampleRateHz / 2;
  const endFreqHz = centerFreqHz + sampleRateHz / 2;

  // Convert coordinate X to frequency
  const xToFreq = useCallback(
    (x: number, width: number) => {
      return startFreqHz + (x / width) * sampleRateHz;
    },
    [startFreqHz, sampleRateHz]
  );

  // Convert frequency to coordinate X
  const freqToX = useCallback(
    (freq: number, width: number) => {
      return ((freq - startFreqHz) / sampleRateHz) * width;
    },
    [startFreqHz, sampleRateHz]
  );

  // Initialize and handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;

        // Recreate offscreen buffer
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.fillStyle = '#080c14';
          offCtx.fillRect(0, 0, w, h);
        }
        offscreenCanvasRef.current = offCanvas;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update waterfall on new spectrum data
  useEffect(() => {
    const canvas = canvasRef.current;
    const offCanvas = offscreenCanvasRef.current;
    if (!canvas || !offCanvas || !spectrum || spectrum.length === 0) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offCanvas.getContext('2d');
    if (!ctx || !offCtx) return;

    const width = canvas.width;
    const height = canvas.height;
    const n = spectrum.length;
    const lut = getColorLUT(colorMap);
    const speed = Math.max(1, Math.min(4, waterfallSpeed));

    // 1. Scroll offscreen canvas down by 'speed' pixels
    offCtx.drawImage(offCanvas, 0, 0, width, height - speed, 0, speed, width, height - speed);

    // 2. Generate new line of pixels
    const lineImgData = offCtx.createImageData(width, speed);
    const data32 = new Uint32Array(lineImgData.data.buffer);

    const dbRange = Math.max(5, maxDb - minDb);

    for (let x = 0; x < width; x++) {
      // Map canvas pixel X to spectrum bin
      const binIdx = Math.floor((x / width) * n);
      const val = spectrum[binIdx];
      const normalized = Math.max(0, Math.min(1, (val - minDb) / dbRange));
      const colorIndex = Math.floor(normalized * 255);
      const pixelColor = lut[colorIndex];

      // Fill 'speed' rows
      for (let s = 0; s < speed; s++) {
        data32[s * width + x] = pixelColor;
      }
    }

    // Put new line at top (y = 0) of offscreen canvas
    offCtx.putImageData(lineImgData, 0, 0);

    // 3. Render offscreen canvas to main canvas
    ctx.drawImage(offCanvas, 0, 0);

    // 4. Draw VFO indicator line overlay on top of waterfall
    const tunerX = freqToX(tunedFreqHz, width);
    const halfBwX = ((filterBandwidthHz / sampleRateHz) * width) / 2;
    const leftX = Math.max(0, tunerX - halfBwX);
    const rightX = Math.min(width, tunerX + halfBwX);

    // Tuned channel passband shadow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(leftX, 0, rightX - leftX, height);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tunerX, 0);
    ctx.lineTo(tunerX, height);
    ctx.stroke();

    // DC Center LO marker
    const loX = freqToX(centerFreqHz, width);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(loX, 0);
    ctx.lineTo(loX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [
    spectrum,
    colorMap,
    minDb,
    maxDb,
    waterfallSpeed,
    tunedFreqHz,
    filterBandwidthHz,
    centerFreqHz,
    sampleRateHz,
    freqToX,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const freq = xToFreq(x, rect.width);
    onTune(Math.round(freq));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden select-none"
      style={{ minHeight: '180px' }}
    >
      {/* Top Overlay Controls Bar */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-violet-950/80 text-violet-400 border border-violet-800/60 backdrop-blur">
            WATERFALL
          </span>

          {/* Palette selector */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-slate-800 rounded px-1.5 py-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono">PALETTE</span>
            <select
              value={colorMap}
              onChange={(e) => onSetColorMap(e.target.value as ColorMapName)}
              className="bg-slate-950 text-slate-200 text-xs font-mono rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer"
            >
              <option value="turbo">Turbo</option>
              <option value="sdrsharp">SDR# Classic</option>
              <option value="viridis">Viridis</option>
              <option value="inferno">Inferno</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="emerald">Emerald</option>
            </select>
          </div>
        </div>

        {/* Contrast / Min Max dB sliders */}
        <div className="flex items-center gap-3 pointer-events-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">MIN:</span>
            <input
              type="range"
              min="-130"
              max="-50"
              step="2"
              value={minDb}
              onChange={(e) => onSetMinDb(Number(e.target.value))}
              className="w-16 h-1 accent-sky-400 cursor-pointer"
              title={`Min dB: ${minDb}`}
            />
            <span className="text-[10px] w-8 text-right text-slate-300">{minDb}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">MAX:</span>
            <input
              type="range"
              min="-80"
              max="-10"
              step="2"
              value={maxDb}
              onChange={(e) => onSetMaxDb(Number(e.target.value))}
              className="w-16 h-1 accent-sky-400 cursor-pointer"
              title={`Max dB: ${maxDb}`}
            />
            <span className="text-[10px] w-8 text-right text-slate-300">{maxDb}</span>
          </div>

          <button
            onClick={() => {
              onSetMinDb(-105);
              onSetMaxDb(-35);
            }}
            className="text-[10px] text-sky-400 hover:text-sky-300 underline"
            title="Auto-reset contrast range"
          >
            AUTO
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        className="w-full h-full cursor-pointer block"
      />
    </div>
  );
};
