export type DemodulationMode = 'WBFM' | 'NBFM' | 'AM' | 'USB' | 'LSB' | 'CW' | 'RAW';

export type WindowFunctionType = 'blackman-harris' | 'hann' | 'hamming' | 'rectangular';

export type ColorMapName = 'turbo' | 'viridis' | 'inferno' | 'sdrsharp' | 'cyberpunk' | 'emerald';

export type FFTSize = 512 | 1024 | 2048 | 4096;

export interface BandPreset {
  id: string;
  name: string;
  category: 'Broadcast' | 'Aviation' | 'Amateur' | 'Weather' | 'ISM' | 'Marine';
  freqHz: number;
  mode: DemodulationMode;
  bandwidthHz: number;
  description: string;
  minFreqHz: number;
  maxFreqHz: number;
}

export interface Bookmark {
  id: string;
  name: string;
  freqHz: number;
  mode: DemodulationMode;
  bandwidthHz: number;
  tag?: string;
  notes?: string;
}

export type SDRplayModel = 'RSP1B' | 'RSP1A' | 'RSPdx' | 'RSPduo' | 'RSP2' | 'Generic';

export interface DeviceConfig {
  model: SDRplayModel;
  centerFreqHz: number;
  sampleRateHz: number;
  lnaGain: number; // 0 to 59 dB
  ifGain: number; // -59 to 0 dB
  agc: boolean;
  biasT: boolean;
  fmNotch: boolean; // RSP1B / RSP1A broadcast FM notch filter
  mwNotch: boolean; // RSP1B / RSP1A medium wave AM notch filter
  dabNotch: boolean; // RSP1B DAB notch filter
  antenna: 'A' | 'B' | 'Hi-Z';
  decimation: 1 | 2 | 4 | 8 | 16 | 32;
}

export interface ConnectionState {
  mode: 'simulator' | 'websocket_tcp' | 'webusb' | 'file_playback';
  connected: boolean;
  host: string;
  port: number;
  latencyMs: number;
  bytesReceived: number;
  sampleDropRate: number;
  deviceLabel: string;
  error?: string;
}

export interface RFMetrics {
  rssiDb: number;
  snrDb: number;
  noiseFloorDb: number;
  peakFreqHz: number;
  peakPowerDb: number;
}

export interface RecordingState {
  isRecording: boolean;
  startTime: number;
  sampleCount: number;
  bytesRecorded: number;
  sampleRate: number;
  centerFreq: number;
}
