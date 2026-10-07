import { FFTSize } from '../types/sdr';

interface SimulatedStation {
  freqHz: number;
  bandwidthHz: number;
  powerDb: number; // e.g. -40 dBFS
  modulation: 'WBFM' | 'NBFM' | 'AM' | 'CW' | 'FSK';
  audioBaseFreq: number;
  bursty?: boolean;
  burstIntervalSec?: number;
  activeUntil?: number;
}

const GLOBAL_STATIONS: SimulatedStation[] = [
  // FM Broadcast Band
  { freqHz: 88.5e6, bandwidthHz: 180000, powerDb: -42, modulation: 'WBFM', audioBaseFreq: 440 },
  { freqHz: 91.1e6, bandwidthHz: 180000, powerDb: -32, modulation: 'WBFM', audioBaseFreq: 520 },
  { freqHz: 95.7e6, bandwidthHz: 180000, powerDb: -26, modulation: 'WBFM', audioBaseFreq: 330 },
  { freqHz: 98.5e6, bandwidthHz: 180000, powerDb: -22, modulation: 'WBFM', audioBaseFreq: 660 },
  { freqHz: 101.9e6, bandwidthHz: 180000, powerDb: -28, modulation: 'WBFM', audioBaseFreq: 587 },
  { freqHz: 104.3e6, bandwidthHz: 180000, powerDb: -35, modulation: 'WBFM', audioBaseFreq: 392 },
  { freqHz: 107.5e6, bandwidthHz: 180000, powerDb: -45, modulation: 'WBFM', audioBaseFreq: 494 },

  // Aviation Airband AM
  { freqHz: 118.7e6, bandwidthHz: 8333, powerDb: -48, modulation: 'AM', audioBaseFreq: 800, bursty: true, burstIntervalSec: 6 },
  { freqHz: 121.5e6, bandwidthHz: 8333, powerDb: -52, modulation: 'AM', audioBaseFreq: 1000, bursty: true, burstIntervalSec: 12 },
  { freqHz: 125.2e6, bandwidthHz: 8333, powerDb: -38, modulation: 'AM', audioBaseFreq: 750, bursty: true, burstIntervalSec: 4 },
  { freqHz: 132.8e6, bandwidthHz: 8333, powerDb: -44, modulation: 'AM', audioBaseFreq: 850, bursty: true, burstIntervalSec: 7 },

  // 2m Amateur Radio Band
  { freqHz: 144.2e6, bandwidthHz: 2800, powerDb: -56, modulation: 'CW', audioBaseFreq: 700 },
  { freqHz: 146.52e6, bandwidthHz: 12500, powerDb: -36, modulation: 'NBFM', audioBaseFreq: 600, bursty: true, burstIntervalSec: 5 },
  { freqHz: 147.12e6, bandwidthHz: 12500, powerDb: -42, modulation: 'NBFM', audioBaseFreq: 650 },

  // Marine VHF
  { freqHz: 156.8e6, bandwidthHz: 12500, powerDb: -50, modulation: 'NBFM', audioBaseFreq: 700, bursty: true, burstIntervalSec: 10 },

  // NOAA Weather Radio
  { freqHz: 162.4e6, bandwidthHz: 12500, powerDb: -30, modulation: 'NBFM', audioBaseFreq: 1050 },
  { freqHz: 162.55e6, bandwidthHz: 12500, powerDb: -34, modulation: 'NBFM', audioBaseFreq: 1050 },

  // HF 40m / 20m Ham Bands
  { freqHz: 7.03e6, bandwidthHz: 500, powerDb: -46, modulation: 'CW', audioBaseFreq: 650 },
  { freqHz: 7.15e6, bandwidthHz: 2700, powerDb: -40, modulation: 'AM', audioBaseFreq: 500 },
  { freqHz: 14.074e6, bandwidthHz: 2500, powerDb: -38, modulation: 'FSK', audioBaseFreq: 1500 }, // FT8 digital
  { freqHz: 14.225e6, bandwidthHz: 2800, powerDb: -35, modulation: 'AM', audioBaseFreq: 600 },

  // ISM 433 MHz
  { freqHz: 433.92e6, bandwidthHz: 50000, powerDb: -35, modulation: 'FSK', audioBaseFreq: 2200, bursty: true, burstIntervalSec: 3 },

  // ADS-B transponder 1090 MHz
  { freqHz: 1090e6, bandwidthHz: 2000000, powerDb: -48, modulation: 'FSK', audioBaseFreq: 3000, bursty: true, burstIntervalSec: 1.5 },
];

export class RFSimulator {
  private phaseAcc = 0;
  private timeSec = 0;

  /**
   * Generates time-domain I and Q samples for given center frequency, sample rate, and FFT buffer size.
   */
  public generateIQFrame(
    centerFreqHz: number,
    sampleRateHz: number,
    bufferSize: FFTSize,
    lnaGain: number = 40,
    ifGain: number = -20,
    fmNotch: boolean = false,
    mwNotch: boolean = false
  ): { i: Float32Array; q: Float32Array } {
    const iBuf = new Float32Array(bufferSize);
    const qBuf = new Float32Array(bufferSize);

    this.timeSec += bufferSize / sampleRateHz;
    const now = this.timeSec;

    // Gain scaling factor
    const totalGain = Math.pow(10, (lnaGain + ifGain) / 40);

    // Baseline thermal noise floor (~ -105 dBFS to -95 dBFS adjusted by gain)
    const noiseScale = 0.008 * (1 + totalGain * 0.05);

    for (let k = 0; k < bufferSize; k++) {
      // Gaussian noise via Box-Muller
      const u1 = Math.max(1e-10, Math.random());
      const u2 = Math.random();
      const mag = Math.sqrt(-2.0 * Math.log(u1)) * noiseScale;
      const angle = 2.0 * Math.PI * u2;

      iBuf[k] = mag * Math.cos(angle);
      qBuf[k] = mag * Math.sin(angle);
    }

    // DC Offset / LO leakage artifact (prominent in Zero-IF SDRs like SDRplay RSP)
    const loLeakage = 0.003 * totalGain;
    for (let k = 0; k < bufferSize; k++) {
      iBuf[k] += loLeakage;
    }

    // Half bandwidth of visible window
    const halfBw = sampleRateHz / 2;
    const minVisFreq = centerFreqHz - halfBw;
    const maxVisFreq = centerFreqHz + halfBw;

    // Add visible stations
    for (const station of GLOBAL_STATIONS) {
      if (station.freqHz + station.bandwidthHz < minVisFreq || station.freqHz - station.bandwidthHz > maxVisFreq) {
        continue; // Out of visible band
      }

      // Check burstiness
      if (station.bursty && station.burstIntervalSec) {
        const period = station.burstIntervalSec;
        const phaseInPeriod = now % period;
        // active for 1.2s in period
        if (phaseInPeriod > 1.2) {
          continue;
        }
      }

      // Frequency offset from SDR center frequency
      const deltaF = station.freqHz - centerFreqHz;
      const omega = (2 * Math.PI * deltaF) / sampleRateHz;

      // RSP1B Hardware Notch Filter Attenuation (approx -35 dB rejection)
      let notchAttenuationDb = 0;
      if (fmNotch && station.freqHz >= 87.5e6 && station.freqHz <= 108e6) {
        notchAttenuationDb = -35;
      } else if (mwNotch && station.freqHz >= 500e3 && station.freqHz <= 1800e3) {
        notchAttenuationDb = -30;
      }

      // Amplitude from powerDb
      const linearAmp = Math.pow(10, (station.powerDb + notchAttenuationDb) / 20) * totalGain * 0.4;

      // Synthesize audio modulation
      const audioOmega = (2 * Math.PI * station.audioBaseFreq) / sampleRateHz;

      for (let k = 0; k < bufferSize; k++) {
        const sampleIdx = k;
        const t = this.timeSec + sampleIdx / sampleRateHz;

        let modI = 1.0;
        let modQ = 0.0;

        switch (station.modulation) {
          case 'WBFM': {
            // FM frequency deviation = 75 kHz * audio signal
            const audioSignal = Math.sin(station.audioBaseFreq * 2 * Math.PI * t) +
              0.5 * Math.sin(station.audioBaseFreq * 1.5 * 2 * Math.PI * t) +
              0.19 * Math.sin(19000 * 2 * Math.PI * t); // 19 kHz stereo pilot!
            const phaseDev = 2.5 * audioSignal;
            modI = Math.cos(phaseDev);
            modQ = Math.sin(phaseDev);
            break;
          }
          case 'NBFM': {
            const audioSignal = Math.sin(station.audioBaseFreq * 2 * Math.PI * t);
            const phaseDev = 0.8 * audioSignal;
            modI = Math.cos(phaseDev);
            modQ = Math.sin(phaseDev);
            break;
          }
          case 'AM': {
            // 80% AM modulation
            const m = 0.8 * (0.5 * Math.sin(station.audioBaseFreq * 2 * Math.PI * t) + 0.5);
            modI = 1.0 + m;
            modQ = 0.0;
            break;
          }
          case 'CW': {
            // Morse dits and dahs keying
            const keying = (Math.sin(3 * 2 * Math.PI * t) > -0.2) ? 1.0 : 0.05;
            modI = keying;
            modQ = 0.0;
            break;
          }
          case 'FSK': {
            // Frequency shift keying
            const bit = (Math.sin(1200 * 2 * Math.PI * t) > 0) ? 1 : -1;
            const fskPhase = bit * 1.2 * t;
            modI = Math.cos(fskPhase);
            modQ = Math.sin(fskPhase);
            break;
          }
        }

        const carrierPhase = omega * sampleIdx + (station.freqHz * 0.0001);
        const carI = Math.cos(carrierPhase);
        const carQ = Math.sin(carrierPhase);

        // Complex multiplication: (carI + j carQ) * (modI + j modQ)
        const sampleI = linearAmp * (carI * modI - carQ * modQ);
        const sampleQ = linearAmp * (carI * modQ + carQ * modI);

        iBuf[k] += sampleI;
        qBuf[k] += sampleQ;
      }
    }

    return { i: iBuf, q: qBuf };
  }
}

export const rfSimulator = new RFSimulator();
