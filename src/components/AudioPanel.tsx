import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Shield, Sliders, Waves, Activity } from 'lucide-react';
import { DemodulationMode } from '../types/sdr';
import { audioDemodulator } from '../dsp/audioDemodulator';

interface AudioPanelProps {
  mode: DemodulationMode;
  filterBandwidthHz: number;
  currentPowerDb: number;
  onSetMode: (mode: DemodulationMode) => void;
  onSetBandwidth: (bwHz: number) => void;
}

const MODES: { id: DemodulationMode; label: string; desc: string; defaultBw: number }[] = [
  { id: 'WBFM', label: 'WFM', desc: 'Wideband FM (Broadcast 200 kHz)', defaultBw: 200000 },
  { id: 'NBFM', label: 'NFM', desc: 'Narrowband FM (VHF/UHF 12.5 kHz)', defaultBw: 12500 },
  { id: 'AM', label: 'AM', desc: 'Amplitude Modulation (Airband / HF 6 kHz)', defaultBw: 6000 },
  { id: 'USB', label: 'USB', desc: 'Upper Sideband (HF Ham 2.8 kHz)', defaultBw: 2800 },
  { id: 'LSB', label: 'LSB', desc: 'Lower Sideband (HF Ham 2.8 kHz)', defaultBw: 2800 },
  { id: 'CW', label: 'CW', desc: 'Continuous Wave Morse (500 Hz)', defaultBw: 500 },
  { id: 'RAW', label: 'RAW', desc: 'Raw IQ (Demodulator Muted)', defaultBw: 200000 },
];

export const AudioPanel: React.FC<AudioPanelProps> = ({
  mode,
  filterBandwidthHz,
  currentPowerDb,
  onSetMode,
  onSetBandwidth,
}) => {
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [squelchDb, setSquelchDb] = useState(-85);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // Poll audio level for VU meter
  useEffect(() => {
    let animId: number;
    const checkLevel = () => {
      setAudioLevel(audioDemodulator.getAudioLevel());
      animId = requestAnimationFrame(checkLevel);
    };
    animId = requestAnimationFrame(checkLevel);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleStartAudio = () => {
    const ok = audioDemodulator.init();
    if (ok) {
      setIsAudioInitialized(true);
      audioDemodulator.setVolume(volume);
      audioDemodulator.setMode(mode);
      audioDemodulator.setSquelch(squelchDb);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioDemodulator.setVolume(newVol);
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioDemodulator.setMute(next);
  };

  const handleSquelchChange = (val: number) => {
    setSquelchDb(val);
    audioDemodulator.setSquelch(val);
  };

  const handleModeChange = (newMode: DemodulationMode) => {
    onSetMode(newMode);
    audioDemodulator.setMode(newMode);
    const target = MODES.find((m) => m.id === newMode);
    if (target) {
      onSetBandwidth(target.defaultBw);
    }
  };

  const isSquelchOpen = currentPowerDb >= squelchDb;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
      {/* Header & Demod Mode Pill Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Waves className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            DEMODULATION
          </span>
        </div>

        {/* Demod Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`px-2 py-1 text-xs font-mono rounded transition ${
                mode === m.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        {/* Filter Bandwidth */}
        <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>FILTER BANDWIDTH</span>
            <span className="text-sky-400 font-bold">
              {filterBandwidthHz >= 1000 ? `${(filterBandwidthHz / 1000).toFixed(1)} kHz` : `${filterBandwidthHz} Hz`}
            </span>
          </div>
          <input
            type="range"
            min="200"
            max="250000"
            step="100"
            value={filterBandwidthHz}
            onChange={(e) => onSetBandwidth(Number(e.target.value))}
            className="w-full h-1.5 accent-sky-400 cursor-pointer"
          />
        </div>

        {/* Squelch Control */}
        <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              SQUELCH
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isSquelchOpen ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
                }`}
                title={isSquelchOpen ? 'Squelch Open (Audio active)' : 'Squelch Closed (Muted by gate)'}
              />
              <span className="text-amber-400 font-bold">{squelchDb} dBm</span>
            </div>
          </div>
          <input
            type="range"
            min="-120"
            max="-40"
            step="1"
            value={squelchDb}
            onChange={(e) => handleSquelchChange(Number(e.target.value))}
            className="w-full h-1.5 accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Volume & Audio Output VU Meter */}
        <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <button
                onClick={handleMuteToggle}
                className="text-slate-300 hover:text-white transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
              </button>
              VOLUME
            </span>
            {!isAudioInitialized ? (
              <button
                onClick={handleStartAudio}
                className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold transition"
              >
                START AUDIO
              </button>
            ) : (
              <span className="text-sky-400 font-bold">{Math.round(volume * 100)}%</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              disabled={isMuted}
              className="flex-1 h-1.5 accent-sky-400 cursor-pointer disabled:opacity-40"
            />

            {/* Mini VU meter bar */}
            <div className="w-16 h-2 bg-slate-800 rounded overflow-hidden flex" title="Audio Output Level">
              <div
                className={`h-full transition-all duration-75 ${
                  audioLevel > 0.7 ? 'bg-rose-500' : audioLevel > 0.4 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, audioLevel * 250)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
