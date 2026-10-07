import { RecordingState } from '../types/sdr';

export class IQRecorder {
  private chunks: Float32Array[] = [];
  private isRecording = false;
  private startTime = 0;
  private totalSamples = 0;
  private sampleRate = 2048000;
  private centerFreq = 100000000;

  public start(sampleRate: number, centerFreq: number) {
    this.chunks = [];
    this.isRecording = true;
    this.startTime = Date.now();
    this.totalSamples = 0;
    this.sampleRate = sampleRate;
    this.centerFreq = centerFreq;
  }

  public stop(): RecordingState {
    this.isRecording = false;
    return this.getState();
  }

  public recordBlock(iBuf: Float32Array, qBuf: Float32Array) {
    if (!this.isRecording) return;
    const len = iBuf.length;
    // Interleaved [I0, Q0, I1, Q1, ...]
    const interleaved = new Float32Array(len * 2);
    for (let k = 0; k < len; k++) {
      interleaved[k * 2] = iBuf[k];
      interleaved[k * 2 + 1] = qBuf[k];
    }
    this.chunks.push(interleaved);
    this.totalSamples += len;
  }

  public getState(): RecordingState {
    const bytes = this.totalSamples * 4; // 2 channels * 2 bytes (16-bit)
    return {
      isRecording: this.isRecording,
      startTime: this.startTime,
      sampleCount: this.totalSamples,
      bytesRecorded: bytes,
      sampleRate: this.sampleRate,
      centerFreq: this.centerFreq,
    };
  }

  public getRecordedChunksCount(): number {
    return this.chunks.length;
  }

  /**
   * Exports recorded IQ data as 16-bit PCM WAV (Left = I, Right = Q)
   */
  public exportWAV(filename?: string) {
    if (this.chunks.length === 0) return;

    const totalFloats = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const numPairs = totalFloats / 2;
    const byteRate = this.sampleRate * 2 * 2; // 2 channels * 16-bit
    const blockAlign = 4;
    const dataSize = numPairs * 4;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 2, true); // NumChannels (2 = I + Q)
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    let offset = 44;
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.length; i++) {
        // Clamp float [-1.0, 1.0] to int16 [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        const int16 = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const name = filename || `sdrplay_capture_${(this.centerFreq / 1e6).toFixed(3)}MHz_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
    this.downloadBlob(blob, name);
  }

  /**
   * Exports raw binary interleaved signed 16-bit Little Endian I/Q format
   */
  public exportRawIQ(filename?: string) {
    if (this.chunks.length === 0) return;

    const totalFloats = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const buffer = new ArrayBuffer(totalFloats * 2);
    const view = new DataView(buffer);

    let offset = 0;
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        const int16 = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const name = filename || `sdrplay_iq16_${(this.centerFreq / 1e6).toFixed(3)}MHz_${this.sampleRate}sps.raw`;
    this.downloadBlob(blob, name);
  }

  /**
   * Exports FFT spectrum power values to CSV
   */
  public exportSpectrumCSV(freqHz: number, sampleRate: number, spectrum: Float32Array, filename?: string) {
    const lines: string[] = ['Frequency_Hz,Frequency_MHz,Power_dBFS'];
    const n = spectrum.length;
    const startFreq = freqHz - sampleRate / 2;
    const step = sampleRate / n;

    for (let i = 0; i < n; i++) {
      const f = startFreq + i * step;
      lines.push(`${f.toFixed(1)},${(f / 1e6).toFixed(6)},${spectrum[i].toFixed(2)}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const name = filename || `sdr_spectrum_${(freqHz / 1e6).toFixed(3)}MHz_${Date.now()}.csv`;
    this.downloadBlob(blob, name);
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export const iqRecorder = new IQRecorder();
