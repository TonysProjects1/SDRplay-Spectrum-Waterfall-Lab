import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Hash, LocateFixed, Radio } from 'lucide-react';
import { BandPreset } from '../types/sdr';

interface TuningControlProps {
  centerFreqHz: number;
  tunedFreqHz: number;
  stepHz: number;
  sampleRateHz: number;
  onSetTunedFreq: (freqHz: number) => void;
  onSetCenterFreq: (freqHz: number) => void;
  onSetStep: (stepHz: number) => void;
  onCenterVFO: () => void;
  onSelectBand: (band: BandPreset) => void;
}

const TUNING_STEPS = [
  { label: '10 Hz', value: 10 },
  { label: '100 Hz', value: 100 },
  { label: '1 kHz', value: 1000 },
  { label: '5 kHz', value: 5000 },
  { label: '8.33 kHz', value: 8333 }, // Airband standard
  { label: '10 kHz', value: 10000 },
  { label: '12.5 kHz', value: 12500 }, // VHF/UHF Ham repeater
  { label: '25 kHz', value: 25000 },
  { label: '100 kHz', value: 100000 }, // FM Broadcast
  { label: '1 MHz', value: 1000000 },
];

export const POPULAR_BANDS: BandPreset[] = [
  {
    id: 'fm_broadcast',
    name: 'FM Broadcast',
    category: 'Broadcast',
    freqHz: 101.9e6,
    mode: 'WBFM',
    bandwidthHz: 200000,
    description: 'Commercial FM Radio (88 - 108 MHz)',
    minFreqHz: 88e6,
    maxFreqHz: 108e6,
  },
  {
    id: 'airband_am',
    name: 'Aviation Airband',
    category: 'Aviation',
    freqHz: 121.5e6,
    mode: 'AM',
    bandwidthHz: 8333,
    description: 'Civil Aviation & Tower ATC (118 - 137 MHz)',
    minFreqHz: 118e6,
    maxFreqHz: 137e6,
  },
  {
    id: 'noaa_weather',
    name: 'NOAA Weather',
    category: 'Weather',
    freqHz: 162.4e6,
    mode: 'NBFM',
    bandwidthHz: 12500,
    description: 'NOAA All-Hazards Radio (162.4 - 162.55 MHz)',
    minFreqHz: 162.4e6,
    maxFreqHz: 162.55e6,
  },
  {
    id: 'ham_2m',
    name: '2m Ham Band',
    category: 'Amateur',
    freqHz: 146.52e6,
    mode: 'NBFM',
    bandwidthHz: 12500,
    description: 'VHF Amateur Radio Simplex / Repeaters (144 - 148 MHz)',
    minFreqHz: 144e6,
    maxFreqHz: 148e6,
  },
  {
    id: 'ham_70cm',
    name: '70cm UHF Ham',
    category: 'Amateur',
    freqHz: 433.0e6,
    mode: 'NBFM',
    bandwidthHz: 12500,
    description: 'UHF Amateur Radio (430 - 440 MHz)',
    minFreqHz: 430e6,
    maxFreqHz: 440e6,
  },
  {
    id: 'hf_40m',
    name: '40m HF Band',
    category: 'Amateur',
    freqHz: 7.15e6,
    mode: 'LSB',
    bandwidthHz: 2800,
    description: 'HF 40m Band (7.0 - 7.3 MHz)',
    minFreqHz: 7.0e6,
    maxFreqHz: 7.3e6,
  },
  {
    id: 'ism_433',
    name: 'ISM 433 MHz',
    category: 'ISM',
    freqHz: 433.92e6,
    mode: 'RAW',
    bandwidthHz: 100000,
    description: 'Short-range wireless sensors, keyfobs, TPMS',
    minFreqHz: 433.05e6,
    maxFreqHz: 434.79e6,
  },
  {
    id: 'adsb_1090',
    name: 'ADS-B 1090 MHz',
    category: 'Aviation',
    freqHz: 1090e6,
    mode: 'RAW',
    bandwidthHz: 2000000,
    description: 'Aircraft Mode-S / ADS-B transponder telemetry',
    minFreqHz: 1088e6,
    maxFreqHz: 1092e6,
  },
];

export const TuningControl: React.FC<TuningControlProps> = ({
  centerFreqHz,
  tunedFreqHz,
  stepHz,
  onSetTunedFreq,
  onSetCenterFreq,
  onSetStep,
  onCenterVFO,
  onSelectBand,
}) => {
  const [directInput, setDirectInput] = useState('');
  const [isDirectInputOpen, setIsDirectInputOpen] = useState(false);

  // Format frequency nicely into MHz and parts
  const mhz = (tunedFreqHz / 1e6).toFixed(6);
  const [wholeMhz, fractionMhz] = mhz.split('.');

  const handleStepUp = () => {
    onSetTunedFreq(tunedFreqHz + stepHz);
  };

  const handleStepDown = () => {
    onSetTunedFreq(Math.max(1000, tunedFreqHz - stepHz));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleStepUp();
    } else {
      handleStepDown();
    }
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInput.trim()) return;

    let clean = directInput.trim().toUpperCase();
    let multiplier = 1;

    if (clean.endsWith('G') || clean.endsWith('GHZ')) {
      multiplier = 1e9;
      clean = clean.replace(/GHZ|G/, '');
    } else if (clean.endsWith('M') || clean.endsWith('MHZ')) {
      multiplier = 1e6;
      clean = clean.replace(/MHZ|M/, '');
    } else if (clean.endsWith('K') || clean.endsWith('KHZ')) {
      multiplier = 1e3;
      clean = clean.replace(/KHZ|K/, '');
    } else {
      // Default: if number is < 2000, assume MHz (e.g. 101.9), else Hz
      const num = parseFloat(clean);
      if (num < 3000) {
        multiplier = 1e6;
      }
    }

    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) {
      const targetHz = Math.round(val * multiplier);
      onSetTunedFreq(targetHz);
      onSetCenterFreq(targetHz);
      setDirectInput('');
      setIsDirectInputOpen(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
      {/* VFO Readout & Step Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Digital Readout */}
        <div
          onWheel={handleWheel}
          className="flex items-baseline gap-1 bg-slate-950 px-4 py-2 rounded-md border border-slate-800 font-mono select-none cursor-ns-resize shadow-inner group"
          title="Scroll mouse wheel over frequency to tune with selected step"
        >
          <Radio className="w-4 h-4 text-rose-500 self-center animate-pulse" />
          <span className="text-xs text-slate-500 font-bold tracking-widest mr-1">VFO</span>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-sky-300 transition-colors">
            {wholeMhz}
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-400">.</span>
          <span className="text-xl sm:text-2xl font-black text-sky-400 tracking-wider">
            {fractionMhz.slice(0, 3)}
          </span>
          <span className="text-base sm:text-lg font-bold text-sky-600 tracking-wider">
            {fractionMhz.slice(3, 6)}
          </span>
          <span className="text-xs font-bold text-slate-500 ml-1">MHz</span>

          {/* Stepper buttons inline */}
          <div className="flex flex-col ml-3 gap-0.5">
            <button
              onClick={handleStepUp}
              className="p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Tune Up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={handleStepDown}
              className="p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Tune Down"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center to VFO & Direct Entry buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCenterVFO}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded border border-slate-700 transition"
            title="Recenter SDR Hardware LO to current VFO frequency"
          >
            <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
            <span>CENTER HARDWARE</span>
          </button>

          <button
            onClick={() => setIsDirectInputOpen(!isDirectInputOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 text-xs font-mono font-medium rounded border border-sky-800 transition"
            title="Enter frequency directly"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>DIRECT ENTRY</span>
          </button>
        </div>
      </div>

      {/* Direct Entry Inline Form */}
      {isDirectInputOpen && (
        <form onSubmit={handleDirectSubmit} className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-sky-900/60 animate-fadeIn">
          <span className="text-xs font-mono text-slate-400">ENTER FREQ:</span>
          <input
            type="text"
            value={directInput}
            onChange={(e) => setDirectInput(e.target.value)}
            placeholder="e.g. 101.9M or 146.520 or 7.15M"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold rounded transition"
          >
            TUNE
          </button>
          <button
            type="button"
            onClick={() => setIsDirectInputOpen(false)}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs font-mono"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Tuning Steps Bar & Quick Band Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
        {/* Step Selector */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">STEP:</span>
          {TUNING_STEPS.map((s) => (
            <button
              key={s.value}
              onClick={() => onSetStep(s.value)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition ${
                stepHz === s.value
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Quick Band Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">BANDS:</span>
          {POPULAR_BANDS.slice(0, 6).map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBand(b)}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition whitespace-nowrap"
              title={`${b.description} (${(b.freqHz / 1e6).toFixed(3)} MHz)`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
