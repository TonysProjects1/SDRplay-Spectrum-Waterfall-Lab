import { DemodulationMode } from '../types/sdr';

export class AudioDemodulator {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private biquadFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private isRunning = false;
  private mode: DemodulationMode = 'WBFM';
  private squelchDb = -85;
  private volume = 0.5;
  private isMuted = false;
  private currentPowerDb = -100;
  private bfoFreqHz = 700;

  // DSP state variables
  private lastI = 0;
  private lastQ = 0;
  private deemphState = 0;
  private bfoPhase = 0;

  // External audio source queue
  private inputIQQueue: { i: Float32Array; q: Float32Array }[] = [];

  constructor() {
    // Lazy initialized on user click to comply with browser autoplay policies
  }

  public init(): boolean {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return true;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 48000 });

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      this.biquadFilter = this.audioCtx.createBiquadFilter();
      this.updateFilter();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;

      // Script processor for real-time IQ demodulation into 48kHz audio
      const bufferSize = 2048;
      this.scriptNode = this.audioCtx.createScriptProcessor(bufferSize, 0, 1);

      this.scriptNode.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        this.processAudioBlock(out);
      };

      this.scriptNode.connect(this.biquadFilter);
      this.biquadFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.isRunning = true;
      return true;
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
      return false;
    }
  }

  public setMode(mode: DemodulationMode) {
    this.mode = mode;
    this.updateFilter();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      const target = this.isMuted ? 0 : this.volume;
      this.gainNode.gain.setValueAtTime(target, this.audioCtx.currentTime);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.setVolume(this.volume);
  }

  public setSquelch(db: number) {
    this.squelchDb = db;
  }

  public setSignalMetrics(currentPowerDb: number) {
    this.currentPowerDb = currentPowerDb;
  }

  public feedIQ(iSamples: Float32Array, qSamples: Float32Array) {
    if (this.inputIQQueue.length < 5) {
      this.inputIQQueue.push({ i: iSamples, q: qSamples });
    }
  }

  private updateFilter() {
    if (!this.biquadFilter || !this.audioCtx) return;

    switch (this.mode) {
      case 'WBFM':
        this.biquadFilter.type = 'lowpass';
        this.biquadFilter.frequency.setValueAtTime(15000, this.audioCtx.currentTime); // 15 kHz audio cut
        this.biquadFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);
        break;
      case 'NBFM':
      case 'AM':
        this.biquadFilter.type = 'lowpass';
        this.biquadFilter.frequency.setValueAtTime(3400, this.audioCtx.currentTime); // 3.4 kHz speech cut
        this.biquadFilter.Q.setValueAtTime(1.0, this.audioCtx.currentTime);
        break;
      case 'USB':
      case 'LSB':
        this.biquadFilter.type = 'bandpass';
        this.biquadFilter.frequency.setValueAtTime(1500, this.audioCtx.currentTime);
        this.biquadFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
        break;
      case 'CW':
        this.biquadFilter.type = 'bandpass';
        this.biquadFilter.frequency.setValueAtTime(this.bfoFreqHz, this.audioCtx.currentTime);
        this.biquadFilter.Q.setValueAtTime(6.0, this.audioCtx.currentTime); // Sharp CW filter
        break;
      default:
        this.biquadFilter.type = 'allpass';
        break;
    }
  }

  private processAudioBlock(out: Float32Array) {
    const isSquelched = this.currentPowerDb < this.squelchDb;

    if (isSquelched || this.mode === 'RAW') {
      out.fill(0);
      return;
    }

    const item = this.inputIQQueue.shift();
    if (!item) {
      // Gentle synthetic atmospheric noise when no physical packets are queued
      const noiseGain = Math.max(0.005, Math.min(0.04, (this.currentPowerDb + 110) * 0.001));
      for (let i = 0; i < out.length; i++) {
        out[i] = (Math.random() * 2 - 1) * noiseGain;
      }
      return;
    }

    const { i: iData, q: qData } = item;
    const len = Math.min(out.length, iData.length);

    switch (this.mode) {
      case 'WBFM':
      case 'NBFM': {
        // FM Polar Discriminator: dPhi = arg(s[n] * conj(s[n-1]))
        const deemphasisAlpha = 0.85; // 75µs deemphasis approx
        for (let k = 0; k < len; k++) {
          const curI = iData[k];
          const curQ = qData[k];

          // Cross product and dot product
          const cross = curI * this.lastQ - curQ * this.lastI;
          const dot = curI * this.lastI + curQ * this.lastQ;
          const angle = Math.atan2(cross, dot);

          this.lastI = curI;
          this.lastQ = curQ;

          // Deemphasis low-pass
          this.deemphState = (1 - deemphasisAlpha) * angle + deemphasisAlpha * this.deemphState;
          out[k] = Math.max(-1, Math.min(1, this.deemphState * 1.5));
        }
        break;
      }

      case 'AM': {
        // Envelope detection: sqrt(I^2 + Q^2) - DC
        let dcAcc = 0;
        for (let k = 0; k < len; k++) {
          const mag = Math.sqrt(iData[k] * iData[k] + qData[k] * qData[k]);
          dcAcc += mag;
          out[k] = mag;
        }
        const dc = dcAcc / len;
        for (let k = 0; k < len; k++) {
          out[k] = Math.max(-1, Math.min(1, (out[k] - dc) * 2.5));
        }
        break;
      }

      case 'CW': {
        // Heterodyne with BFO oscillator
        const bfoStep = (2 * Math.PI * this.bfoFreqHz) / 48000;
        for (let k = 0; k < len; k++) {
          const mag = Math.sqrt(iData[k] * iData[k] + qData[k] * qData[k]);
          this.bfoPhase += bfoStep;
          if (this.bfoPhase > Math.PI * 2) this.bfoPhase -= Math.PI * 2;
          out[k] = Math.sin(this.bfoPhase) * mag * 1.8;
        }
        break;
      }

      case 'USB':
      case 'LSB': {
        // Phasing SSB: I(t) +/- Q_hat(t)
        const sign = this.mode === 'USB' ? 1 : -1;
        for (let k = 0; k < len; k++) {
          out[k] = Math.max(-1, Math.min(1, (iData[k] + sign * qData[k]) * 1.8));
        }
        break;
      }
    }

    // Fill remaining if out is longer
    for (let k = len; k < out.length; k++) {
      out[k] = 0;
    }
  }

  public getAudioLevel(): number {
    if (!this.analyser || !this.isRunning || this.isMuted) return 0;
    const buf = new Uint8Array(64);
    this.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  public destroy() {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export const audioDemodulator = new AudioDemodulator();
