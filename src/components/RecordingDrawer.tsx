import React, { useState, useEffect } from 'react';
import {
  Disc,
  Download,
  FileCode,
  FileSpreadsheet,
  Film,
  HardDrive,
  Play,
  Square,
  Upload,
  X,
  CheckCircle,
} from 'lucide-react';
import { RecordingState } from '../types/sdr';
import { iqRecorder } from '../dsp/iqRecorder';

interface RecordingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  centerFreqHz: number;
  sampleRateHz: number;
  spectrum: Float32Array;
  onLoadFileIQ?: (iData: Float32Array, qData: Float32Array, centerFreq: number, sampleRate: number) => void;
}

export const RecordingDrawer: React.FC<RecordingDrawerProps> = ({
  isOpen,
  onClose,
  centerFreqHz,
  sampleRateHz,
  spectrum,
  onLoadFileIQ,
}) => {
  const [recState, setRecState] = useState<RecordingState>({
    isRecording: false,
    startTime: 0,
    sampleCount: 0,
    bytesRecorded: 0,
    sampleRate: sampleRateHz,
    centerFreq: centerFreqHz,
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hasRecordedData, setHasRecordedData] = useState(false);

  // Timer loop when recording
  useEffect(() => {
    let timer: number;
    if (recState.isRecording) {
      timer = window.setInterval(() => {
        const s = iqRecorder.getState();
        setRecState(s);
        setElapsedSec(Math.floor((Date.now() - s.startTime) / 1000));
      }, 250);
    }
    return () => clearInterval(timer);
  }, [recState.isRecording]);

  if (!isOpen) return null;

  const handleStartRecording = () => {
    iqRecorder.start(sampleRateHz, centerFreqHz);
    setRecState(iqRecorder.getState());
    setHasRecordedData(false);
  };

  const handleStopRecording = () => {
    const finalState = iqRecorder.stop();
    setRecState(finalState);
    setHasRecordedData(iqRecorder.getRecordedChunksCount() > 0);
  };

  const handleExportWAV = () => {
    iqRecorder.exportWAV();
  };

  const handleExportRawIQ = () => {
    iqRecorder.exportRawIQ();
  };

  const handleExportCSV = () => {
    iqRecorder.exportSpectrumCSV(centerFreqHz, sampleRateHz, spectrum);
  };

  // Offline file loader for recorded IQ / WAV files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const numInt16 = buffer.byteLength / 2;
      const numPairs = Math.floor(numInt16 / 2);
      const view = new DataView(buffer);

      const iArray = new Float32Array(numPairs);
      const qArray = new Float32Array(numPairs);

      // Check if WAV header (first 4 bytes === 'RIFF')
      let offset = 0;
      if (buffer.byteLength > 44) {
        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        if (magic === 'RIFF') {
          offset = 44; // Skip 44-byte WAV header
        }
      }

      for (let k = 0; k < numPairs; k++) {
        if (offset + 4 > buffer.byteLength) break;
        const iVal = view.getInt16(offset, true) / 32768.0;
        const qVal = view.getInt16(offset + 2, true) / 32768.0;
        iArray[k] = iVal;
        qArray[k] = qVal;
        offset += 4;
      }

      if (onLoadFileIQ) {
        onLoadFileIQ(iArray, qArray, centerFreqHz, sampleRateHz);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col p-5 animate-slideLeft">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-rose-500" />
          <h2 className="text-base font-bold font-mono text-white">RF Capture &amp; Recording</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5 text-sm font-sans">
        {/* Record Control Box */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">LIVE I/Q RECORDER</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${
                recState.isRecording
                  ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              {recState.isRecording ? 'RECORDING' : 'IDLE'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-slate-500">ELAPSED TIME</div>
              <div className="text-base font-bold text-white">
                {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:
                {String(elapsedSec % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-slate-500">CAPTURED SIZE</div>
              <div className="text-base font-bold text-sky-400">
                {(recState.bytesRecorded / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          {/* Start / Stop Button */}
          {!recState.isRecording ? (
            <button
              onClick={handleStartRecording}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950"
            >
              <Disc className="w-4 h-4" />
              START I/Q CAPTURE
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-mono text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 border border-rose-700"
            >
              <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
              STOP RECORDING
            </button>
          )}

          <div className="text-[11px] text-slate-500 font-mono">
            Target: {(centerFreqHz / 1e6).toFixed(4)} MHz @ {(sampleRateHz / 1e6).toFixed(3)} MSps
          </div>
        </div>

        {/* Export Formats */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Export Captured RF Data
          </h3>

          <div className="space-y-2">
            <button
              onClick={handleExportWAV}
              disabled={!hasRecordedData && !recState.isRecording}
              className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 disabled:opacity-40 disabled:hover:bg-slate-950 text-left rounded-lg border border-slate-800 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-mono font-bold text-slate-200">Export as 16-bit WAV I/Q (.wav)</div>
                  <div className="text-[11px] text-slate-400">Compatible with SDR#, Audacity, GNU Radio</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>

            <button
              onClick={handleExportRawIQ}
              disabled={!hasRecordedData && !recState.isRecording}
              className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 disabled:opacity-40 disabled:hover:bg-slate-950 text-left rounded-lg border border-slate-800 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-mono font-bold text-slate-200">Export Raw Binary I/Q (.raw / .iq)</div>
                  <div className="text-[11px] text-slate-400">Interleaved I/Q for Inspectrum, SigDigger, Python</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 text-left rounded-lg border border-slate-800 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-mono font-bold text-slate-200">Export Spectrum Power CSV (.csv)</div>
                  <div className="text-[11px] text-slate-400">Frequency vs dBFS power for lab reporting</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Offline File Replay */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-400" />
            Load &amp; Inspect Offline I/Q File
          </h3>
          <p className="text-xs text-slate-400">
            Inspect previously recorded <code className="text-sky-300">.wav</code> or <code className="text-sky-300">.raw</code> I/Q files offline directly in this visualizer:
          </p>

          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition">
            <Upload className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs font-mono text-slate-300">Select .wav or .raw file</span>
            <span className="text-[10px] text-slate-500">Max recommended: 100 MB</span>
            <input type="file" accept=".wav,.raw,.iq,.bin" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
