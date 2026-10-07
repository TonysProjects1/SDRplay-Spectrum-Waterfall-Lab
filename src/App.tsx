import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ColorMapName,
  DemodulationMode,
  FFTSize,
  WindowFunctionType,
  ConnectionState,
  RFMetrics,
  Bookmark,
  BandPreset,
} from './types/sdr';
import { computePowerSpectrum, updateSpectrumAccumulators } from './dsp/fft';
import { rfSimulator } from './dsp/rfSimulator';
import { audioDemodulator } from './dsp/audioDemodulator';
import { iqRecorder } from './dsp/iqRecorder';
import { Header } from './components/Header';
import { SpectrumDisplay } from './components/SpectrumDisplay';
import { WaterfallDisplay } from './components/WaterfallDisplay';
import { TuningControl, POPULAR_BANDS } from './components/TuningControl';
import { AudioPanel } from './components/AudioPanel';
import { DeviceSetupModal } from './components/DeviceSetupModal';
import { RecordingDrawer } from './components/RecordingDrawer';
import { BandPlanModal } from './components/BandPlanModal';
import { RSP1BGuideModal } from './components/RSP1BGuideModal';
import {
  SlidersHorizontal,
  Maximize2,
  Columns,
  Layers,
  Zap,
  Info,
} from 'lucide-react';

export default function App() {
  // RF Hardware & VFO Parameters
  const [centerFreqHz, setCenterFreqHz] = useState(101900000); // 101.9 MHz FM Broadcast default
  const [tunedFreqHz, setTunedFreqHz] = useState(101900000);
  const [sampleRateHz, setSampleRateHz] = useState(2048000); // 2.048 MSps
  const [stepHz, setStepHz] = useState(100000); // 100 kHz
  const [lnaGain, setLnaGain] = useState(38); // 0 to 59 dB
  const [ifGain, setIfGain] = useState(-24); // -59 to 0 dB
  const [biasT, setBiasT] = useState(false);
  const [fmNotch, setFmNotch] = useState(false); // RSP1B Broadcast FM Notch
  const [mwNotch, setMwNotch] = useState(false); // RSP1B Medium Wave Notch
  const [dabNotch, setDabNotch] = useState(false); // RSP1B DAB Notch

  // Demodulator state
  const [demodMode, setDemodMode] = useState<DemodulationMode>('WBFM');
  const [filterBandwidthHz, setFilterBandwidthHz] = useState(200000);

  // Spectrum & Waterfall display settings
  const [fftSize, setFftSize] = useState<FFTSize>(1024);
  const [windowType] = useState<WindowFunctionType>('blackman-harris');
  const [minDb, setMinDb] = useState(-115);
  const [maxDb, setMaxDb] = useState(-25);
  const [colorMap, setColorMap] = useState<ColorMapName>('turbo');
  const [waterfallSpeed, setWaterfallSpeed] = useState(1);
  const [showAvg, setShowAvg] = useState(false);
  const [showPeak, setShowPeak] = useState(true);
  const [viewMode, setViewMode] = useState<'both' | 'spectrum' | 'waterfall'>('both');

  // Modulation & Signal state
  const [spectrum, setSpectrum] = useState<Float32Array>(new Float32Array(1024));
  const [avgSpectrum, setAvgSpectrum] = useState<Float32Array>(new Float32Array(1024));
  const [peakSpectrum, setPeakSpectrum] = useState<Float32Array>(new Float32Array(1024));

  const [rfMetrics, setRfMetrics] = useState<RFMetrics>({
    rssiDb: -78.4,
    snrDb: 24.2,
    noiseFloorDb: -102.6,
    peakFreqHz: 101900000,
    peakPowerDb: -42.1,
  });

  // Modals & Panels
  const [isDeviceSetupOpen, setIsDeviceSetupOpen] = useState(false);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [isBandPlanOpen, setIsBandPlanOpen] = useState(false);
  const [isGainDrawerOpen, setIsGainDrawerOpen] = useState(false);
  const [isRSP1BGuideOpen, setIsRSP1BGuideOpen] = useState(false);

  // Connection State
  const [connection, setConnection] = useState<ConnectionState>({
    mode: 'simulator',
    connected: true,
    host: '127.0.0.1',
    port: 1234,
    latencyMs: 1,
    bytesReceived: 0,
    sampleDropRate: 0,
    deviceLabel: 'RF Simulator (Ready)',
  });

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    {
      id: 'bm1',
      name: 'NPR Local Broadcast',
      freqHz: 91100000,
      mode: 'WBFM',
      bandwidthHz: 200000,
      tag: 'FM',
    },
    {
      id: 'bm2',
      name: 'VHF Air Guard Emergency',
      freqHz: 121500000,
      mode: 'AM',
      bandwidthHz: 8333,
      tag: 'Airband',
    },
    {
      id: 'bm3',
      name: 'NOAA Weather Radio 1',
      freqHz: 162400000,
      mode: 'NBFM',
      bandwidthHz: 12500,
      tag: 'Weather',
    },
    {
      id: 'bm4',
      name: 'National Simplex Calling',
      freqHz: 146520000,
      mode: 'NBFM',
      bandwidthHz: 12500,
      tag: 'Ham',
    },
  ]);

  // WebSocket reference for TCP SDR streaming
  const wsRef = useRef<WebSocket | null>(null);

  // Spectrum buffers kept in refs for fast RAF updates without re-renders every frame
  const curSpectrumRef = useRef(new Float32Array(fftSize));
  const avgSpectrumRef = useRef(new Float32Array(fftSize));
  const peakSpectrumRef = useRef(new Float32Array(fftSize));
  const lastMetricsUpdate = useRef(0);

  // Resize buffers when FFT size changes
  useEffect(() => {
    curSpectrumRef.current = new Float32Array(fftSize);
    avgSpectrumRef.current = new Float32Array(fftSize);
    peakSpectrumRef.current = new Float32Array(fftSize);
    setSpectrum(new Float32Array(fftSize));
    setAvgSpectrum(new Float32Array(fftSize));
    setPeakSpectrum(new Float32Array(fftSize));
  }, [fftSize]);

  // Main High-Performance DSP animation loop (Simulator mode)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (connection.mode === 'simulator') {
        // Generate RF samples
        const { i, q } = rfSimulator.generateIQFrame(
          centerFreqHz,
          sampleRateHz,
          fftSize,
          lnaGain,
          ifGain,
          fmNotch,
          mwNotch
        );

        // Record if active
        iqRecorder.recordBlock(i, q);

        // Feed Audio Demodulator
        audioDemodulator.feedIQ(i, q);

        // Compute FFT Power Spectrum
        computePowerSpectrum(i, q, fftSize, windowType, curSpectrumRef.current);
        updateSpectrumAccumulators(
          curSpectrumRef.current,
          avgSpectrumRef.current,
          peakSpectrumRef.current,
          0.25,
          0.15
        );

        // Send copies to state for canvas renders
        setSpectrum(new Float32Array(curSpectrumRef.current));
        if (showAvg) setAvgSpectrum(new Float32Array(avgSpectrumRef.current));
        if (showPeak) setPeakSpectrum(new Float32Array(peakSpectrumRef.current));

        // Periodically update RF signal metrics
        const now = Date.now();
        if (now - lastMetricsUpdate.current > 150) {
          lastMetricsUpdate.current = now;
          let maxVal = -150;
          let maxIdx = 0;
          let sumVal = 0;

          const n = curSpectrumRef.current.length;
          for (let k = 0; k < n; k++) {
            const v = curSpectrumRef.current[k];
            sumVal += v;
            if (v > maxVal) {
              maxVal = v;
              maxIdx = k;
            }
          }

          const noiseFloor = sumVal / n;
          const peakFreq = centerFreqHz - sampleRateHz / 2 + (maxIdx / n) * sampleRateHz;

          // Estimate power at tuned frequency
          const tunedBin = Math.floor(
            ((tunedFreqHz - (centerFreqHz - sampleRateHz / 2)) / sampleRateHz) * n
          );
          const channelPower =
            tunedBin >= 0 && tunedBin < n ? curSpectrumRef.current[tunedBin] : -100;

          audioDemodulator.setSignalMetrics(channelPower);

          setRfMetrics({
            rssiDb: channelPower,
            snrDb: Math.max(0, channelPower - noiseFloor),
            noiseFloorDb: noiseFloor,
            peakFreqHz: Math.round(peakFreq),
            peakPowerDb: maxVal,
          });

          setConnection((prev) => ({
            ...prev,
            bytesReceived: prev.bytesReceived + fftSize * 4,
          }));
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    connection.mode,
    centerFreqHz,
    tunedFreqHz,
    sampleRateHz,
    fftSize,
    windowType,
    lnaGain,
    ifGain,
    fmNotch,
    mwNotch,
    showAvg,
    showPeak,
  ]);

  // WebSocket connection for real SDRplay TCP streaming
  const handleConnectTCP = useCallback(
    (host: string, port: number) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/sdr/ws`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      setConnection({
        mode: 'websocket_tcp',
        connected: false,
        host,
        port,
        latencyMs: 0,
        bytesReceived: 0,
        sampleDropRate: 0,
        deviceLabel: `Connecting to ${host}:${port}...`,
      });

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'CONNECT_TCP',
            host,
            port,
            frequency: centerFreqHz,
            sampleRate: sampleRateHz,
            gain: lnaGain,
          })
        );
      };

      ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'TCP_CONNECTED') {
              setConnection((prev) => ({
                ...prev,
                connected: true,
                deviceLabel: `SDRplay @ ${host}:${port}`,
                error: undefined,
              }));
            } else if (msg.type === 'TCP_ERROR') {
              setConnection((prev) => ({
                ...prev,
                connected: false,
                error: msg.error || 'Connection failed',
                deviceLabel: `Error: ${msg.error}`,
              }));
            }
          } catch {
            // Ignore
          }
        } else if (e.data instanceof ArrayBuffer) {
          // Binary raw IQ data from SDRplay TCP!
          const buffer = e.data;
          const bytes = new Uint8Array(buffer);
          const numSamples = Math.min(fftSize, Math.floor(bytes.length / 2));

          const iBuf = new Float32Array(fftSize);
          const qBuf = new Float32Array(fftSize);

          for (let k = 0; k < numSamples; k++) {
            // Convert unsigned 8-bit to normalized float [-1.0, 1.0]
            iBuf[k] = (bytes[k * 2] - 128) / 128.0;
            qBuf[k] = (bytes[k * 2 + 1] - 128) / 128.0;
          }

          computePowerSpectrum(iBuf, qBuf, fftSize, windowType, curSpectrumRef.current);
          updateSpectrumAccumulators(
            curSpectrumRef.current,
            avgSpectrumRef.current,
            peakSpectrumRef.current,
            0.3,
            0.2
          );

          setSpectrum(new Float32Array(curSpectrumRef.current));
          if (showAvg) setAvgSpectrum(new Float32Array(avgSpectrumRef.current));
          if (showPeak) setPeakSpectrum(new Float32Array(peakSpectrumRef.current));

          audioDemodulator.feedIQ(iBuf, qBuf);
          iqRecorder.recordBlock(iBuf, qBuf);

          setConnection((prev) => ({
            ...prev,
            bytesReceived: prev.bytesReceived + buffer.byteLength,
          }));
        }
      };

      ws.onerror = () => {
        setConnection((prev) => ({
          ...prev,
          connected: false,
          error: 'WebSocket bridge unavailable. Is backend running?',
        }));
      };

      ws.onclose = () => {
        setConnection((prev) => ({
          ...prev,
          connected: false,
          deviceLabel: 'Disconnected',
        }));
      };

      wsRef.current = ws;
    },
    [centerFreqHz, sampleRateHz, lnaGain, fftSize, windowType, showAvg, showPeak]
  );

  const handleDisconnectTCP = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'DISCONNECT_TCP' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnection({
      mode: 'simulator',
      connected: true,
      host: '127.0.0.1',
      port: 1234,
      latencyMs: 1,
      bytesReceived: 0,
      sampleDropRate: 0,
      deviceLabel: 'RF Simulator (Active)',
    });
  };

  const handleSelectSimulator = () => {
    handleDisconnectTCP();
  };

  // WebUSB support
  const handleConnectWebUSB = async () => {
    if (!('usb' in navigator)) {
      alert('WebUSB is not supported in this browser. Use Chrome, Edge, or the TCP bridge.');
      return;
    }

    try {
      // SDRplay vendor ID 0x1df7 or RTL-SDR 0x0bda
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x1df7 }, // SDRplay Mirics MSi2500
          { vendorId: 0x0bda }, // RTL-SDR Realtek
          { vendorId: 0x04b4 }, // Cypress FX2
        ],
      });

      if (device) {
        setConnection({
          mode: 'webusb',
          connected: true,
          host: 'USB',
          port: 0,
          latencyMs: 1,
          bytesReceived: 0,
          sampleDropRate: 0,
          deviceLabel: `USB: ${device.productName || 'SDR Device'}`,
        });
        setIsDeviceSetupOpen(false);
      }
    } catch (err: any) {
      console.warn('WebUSB canceled or failed:', err);
    }
  };

  // Center Hardware LO to VFO
  const handleCenterVFO = () => {
    setCenterFreqHz(tunedFreqHz);
    if (wsRef.current && connection.connected) {
      wsRef.current.send(JSON.stringify({ type: 'SET_FREQ', frequency: tunedFreqHz }));
    }
  };

  // Change Tuned Frequency
  const handleTune = (freqHz: number) => {
    setTunedFreqHz(freqHz);
  };

  // Band Preset selection
  const handleSelectBand = (band: BandPreset) => {
    setCenterFreqHz(band.freqHz);
    setTunedFreqHz(band.freqHz);
    setDemodMode(band.mode);
    setFilterBandwidthHz(band.bandwidthHz);
    audioDemodulator.setMode(band.mode);

    if (wsRef.current && connection.connected) {
      wsRef.current.send(JSON.stringify({ type: 'SET_FREQ', frequency: band.freqHz }));
    }
  };

  // Export spectrum snapshot image
  const handleSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdrplay_snapshot_${(tunedFreqHz / 1e6).toFixed(3)}MHz_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Bookmarks management
  const handleAddBookmark = (bm: Bookmark) => {
    setBookmarks((prev) => [bm, ...prev]);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        connection={connection}
        metrics={rfMetrics}
        sampleRateHz={sampleRateHz}
        fftSize={fftSize}
        isRecording={iqRecorder.getState().isRecording}
        onOpenDeviceSetup={() => setIsDeviceSetupOpen(true)}
        onOpenRecording={() => setIsRecordingOpen(true)}
        onOpenBandPlan={() => setIsBandPlanOpen(true)}
        onOpenRSP1BGuide={() => setIsRSP1BGuideOpen(true)}
        onSetSampleRate={(r) => {
          setSampleRateHz(r);
          if (wsRef.current && connection.connected) {
            wsRef.current.send(JSON.stringify({ type: 'SET_RATE', sampleRate: r }));
          }
        }}
        onSetFFTSize={setFftSize}
      />

      {/* Main Spectrum & Waterfall Work area */}
      <main className="flex-1 flex flex-col p-3 gap-2 overflow-hidden relative">
        {/* View Mode Bar */}
        <div className="flex items-center justify-between px-1 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>LAYOUT:</span>
            <button
              onClick={() => setViewMode('both')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'both' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              SPLIT (BOTH)
            </button>
            <button
              onClick={() => setViewMode('spectrum')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'spectrum' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              SPECTRUM ONLY
            </button>
            <button
              onClick={() => setViewMode('waterfall')}
              className={`px-2 py-0.5 rounded transition ${
                viewMode === 'waterfall' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              WATERFALL ONLY
            </button>
          </div>

          {/* Quick Hardware Gain Drawer toggle */}
          <button
            onClick={() => setIsGainDrawerOpen(!isGainDrawerOpen)}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>RF GAIN &amp; BIAS-T</span>
          </button>
        </div>

        {/* Hardware Gain Control Drawer */}
        {isGainDrawerOpen && (
          <div className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-5 gap-3 animate-fadeIn text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>LNA GAIN</span>
                <span className="text-sky-400 font-bold">{lnaGain} dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="59"
                value={lnaGain}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLnaGain(val);
                  if (wsRef.current && connection.connected) {
                    wsRef.current.send(JSON.stringify({ type: 'SET_GAIN', gain: val }));
                  }
                }}
                className="w-full h-1.5 accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>IF GAIN REDUCTION</span>
                <span className="text-amber-400 font-bold">{ifGain} dB</span>
              </div>
              <input
                type="range"
                min="-59"
                max="0"
                value={ifGain}
                onChange={(e) => setIfGain(Number(e.target.value))}
                className="w-full h-1.5 accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-slate-400 block mb-1">BIAS-T (4.7V)</span>
              <button
                onClick={() => setBiasT(!biasT)}
                className={`px-3 py-1 rounded font-bold transition w-full ${
                  biasT
                    ? 'bg-rose-600 text-white shadow-[0_0_8px_#f43f5e]'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {biasT ? 'ON (ACTIVE)' : 'OFF'}
              </button>
            </div>

            {/* RSP1B Notch Filters */}
            <div className="sm:col-span-2 flex flex-col justify-between">
              <span className="text-slate-400 block mb-1">RSP1B HARDWARE NOTCH FILTERS</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFmNotch(!fmNotch)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition flex-1 ${
                    fmNotch
                      ? 'bg-emerald-600 text-white shadow-[0_0_6px_#059669]'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Broadcast FM Band Notch (88-108 MHz) - 35 dB rejection"
                >
                  FM NOTCH
                </button>
                <button
                  onClick={() => setMwNotch(!mwNotch)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition flex-1 ${
                    mwNotch
                      ? 'bg-emerald-600 text-white shadow-[0_0_6px_#059669]'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Medium Wave AM Broadcast Notch (500-1700 kHz)"
                >
                  MW NOTCH
                </button>
                <button
                  onClick={() => setDabNotch(!dabNotch)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition flex-1 ${
                    dabNotch
                      ? 'bg-emerald-600 text-white shadow-[0_0_6px_#059669]'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="DAB Digital Audio Broadcast Notch"
                >
                  DAB NOTCH
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visualizers Container */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {(viewMode === 'both' || viewMode === 'spectrum') && (
            <SpectrumDisplay
              centerFreqHz={centerFreqHz}
              sampleRateHz={sampleRateHz}
              tunedFreqHz={tunedFreqHz}
              filterBandwidthHz={filterBandwidthHz}
              spectrum={spectrum}
              avgSpectrum={avgSpectrum}
              peakSpectrum={peakSpectrum}
              minDb={minDb}
              maxDb={maxDb}
              fftSize={fftSize}
              windowType={windowType}
              showAvg={showAvg}
              showPeak={showPeak}
              onTune={handleTune}
              onSetBandwidth={setFilterBandwidthHz}
              onToggleAvg={() => setShowAvg(!showAvg)}
              onTogglePeak={() => setShowPeak(!showPeak)}
              onSnapshot={handleSnapshot}
            />
          )}

          {(viewMode === 'both' || viewMode === 'waterfall') && (
            <WaterfallDisplay
              centerFreqHz={centerFreqHz}
              sampleRateHz={sampleRateHz}
              tunedFreqHz={tunedFreqHz}
              filterBandwidthHz={filterBandwidthHz}
              spectrum={spectrum}
              minDb={minDb}
              maxDb={maxDb}
              colorMap={colorMap}
              waterfallSpeed={waterfallSpeed}
              onTune={handleTune}
              onSetColorMap={setColorMap}
              onSetMinDb={setMinDb}
              onSetMaxDb={setMaxDb}
            />
          )}
        </div>

        {/* Lower Radio Control Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 shrink-0">
          <TuningControl
            centerFreqHz={centerFreqHz}
            tunedFreqHz={tunedFreqHz}
            stepHz={stepHz}
            sampleRateHz={sampleRateHz}
            onSetTunedFreq={handleTune}
            onSetCenterFreq={setCenterFreqHz}
            onSetStep={setStepHz}
            onCenterVFO={handleCenterVFO}
            onSelectBand={handleSelectBand}
          />

          <AudioPanel
            mode={demodMode}
            filterBandwidthHz={filterBandwidthHz}
            currentPowerDb={rfMetrics.rssiDb}
            onSetMode={setDemodMode}
            onSetBandwidth={setFilterBandwidthHz}
          />
        </div>
      </main>

      {/* Modals & Drawers */}
      <DeviceSetupModal
        isOpen={isDeviceSetupOpen}
        onClose={() => setIsDeviceSetupOpen(false)}
        connection={connection}
        onConnectTCP={handleConnectTCP}
        onDisconnectTCP={handleDisconnectTCP}
        onSelectSimulator={handleSelectSimulator}
        onConnectWebUSB={handleConnectWebUSB}
        onOpenRSP1BGuide={() => setIsRSP1BGuideOpen(true)}
      />

      <RecordingDrawer
        isOpen={isRecordingOpen}
        onClose={() => setIsRecordingOpen(false)}
        centerFreqHz={centerFreqHz}
        sampleRateHz={sampleRateHz}
        spectrum={spectrum}
      />

      <BandPlanModal
        isOpen={isBandPlanOpen}
        onClose={() => setIsBandPlanOpen(false)}
        bookmarks={bookmarks}
        onSelectFrequency={(freq, mode, bw) => {
          setCenterFreqHz(freq);
          setTunedFreqHz(freq);
          setDemodMode(mode);
          setFilterBandwidthHz(bw);
          audioDemodulator.setMode(mode);
        }}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
      />

      {/* Dedicated RSP1B Installation & Local Run Guide */}
      <RSP1BGuideModal
        isOpen={isRSP1BGuideOpen}
        onClose={() => setIsRSP1BGuideOpen(false)}
        onOpenDeviceSetup={() => {
          setIsRSP1BGuideOpen(false);
          setIsDeviceSetupOpen(true);
        }}
      />
    </div>
  );
}
