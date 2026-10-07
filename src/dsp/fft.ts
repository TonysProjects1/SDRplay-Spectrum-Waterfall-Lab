import { FFTSize, WindowFunctionType } from '../types/sdr';

// Precomputed window functions cached by size and type
const windowCache = new Map<string, Float32Array>();

export function getWindow(size: number, type: WindowFunctionType): Float32Array {
  const key = `${size}-${type}`;
  if (windowCache.has(key)) {
    return windowCache.get(key)!;
  }

  const win = new Float32Array(size);
  const n = size;

  for (let i = 0; i < n; i++) {
    switch (type) {
      case 'blackman-harris': {
        // 4-term Blackman-Harris window: excellent sidelobe suppression (-92 dB)
        const a0 = 0.35875;
        const a1 = 0.48829;
        const a2 = 0.14128;
        const a3 = 0.01168;
        win[i] =
          a0 -
          a1 * Math.cos((2 * Math.PI * i) / (n - 1)) +
          a2 * Math.cos((4 * Math.PI * i) / (n - 1)) -
          a3 * Math.cos((6 * Math.PI * i) / (n - 1));
        break;
      }
      case 'hann':
        win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
        break;
      case 'hamming':
        win[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
        break;
      case 'rectangular':
      default:
        win[i] = 1.0;
        break;
    }
  }

  windowCache.set(key, win);
  return win;
}

// Bit reversal permutation table cache
const bitRevCache = new Map<number, Uint32Array>();

function getBitReversal(n: number): Uint32Array {
  if (bitRevCache.has(n)) {
    return bitRevCache.get(n)!;
  }
  const rev = new Uint32Array(n);
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    rev[i] = j;
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
  rev[n - 1] = n - 1;
  bitRevCache.set(n, rev);
  return rev;
}

// Radix-2 Complex FFT (in-place)
// real and imag arrays are modified in-place
export function complexFFT(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  const bitRev = getBitReversal(n);

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = bitRev[i];
    if (j > i) {
      const tempR = real[i];
      const tempI = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tempR;
      imag[j] = tempI;
    }
  }

  // Cooley-Tukey butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angleStep = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angleStep);
    const wStepI = Math.sin(angleStep);

    for (let i = 0; i < n; i += len) {
      let wr = 1.0;
      let wi = 0.0;
      for (let j = 0; j < halfLen; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];

        const vR = real[i + j + halfLen] * wr - imag[i + j + halfLen] * wi;
        const vI = real[i + j + halfLen] * wi + imag[i + j + halfLen] * wr;

        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;

        real[i + j + halfLen] = uR - vR;
        imag[i + j + halfLen] = uI - vI;

        const nextWr = wr * wStepR - wi * wStepI;
        wi = wr * wStepI + wi * wStepR;
        wr = nextWr;
      }
    }
  }
}

/**
 * Computes power spectrum (dBFS) from complex I/Q time-domain buffer
 * Output is FFT-shifted (DC at center index N/2)
 */
export function computePowerSpectrum(
  iBuffer: Float32Array,
  qBuffer: Float32Array,
  fftSize: FFTSize,
  windowType: WindowFunctionType = 'blackman-harris',
  outSpectrum?: Float32Array
): Float32Array {
  const out = outSpectrum || new Float32Array(fftSize);
  const win = getWindow(fftSize, windowType);

  // Apply windowing to copy
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let k = 0; k < fftSize; k++) {
    const w = win[k];
    real[k] = (iBuffer[k] || 0) * w;
    imag[k] = (qBuffer[k] || 0) * w;
  }

  complexFFT(real, imag);

  const half = fftSize >> 1;
  const norm = 1.0 / fftSize;

  // FFT shift: place negative freqs [half..N-1] at [0..half-1], and positive freqs [0..half-1] at [half..N-1]
  for (let k = 0; k < fftSize; k++) {
    const srcIndex = (k + half) % fftSize;
    const r = real[srcIndex] * norm;
    const im = imag[srcIndex] * norm;
    const power = r * r + im * im;

    // Convert to dBFS, clamped between -150 dB and +10 dB
    const db = 10 * Math.log10(power + 1e-15);
    out[k] = Math.max(-150, Math.min(10, db));
  }

  return out;
}

/**
 * Smooths current spectrum into average and updates peak hold
 */
export function updateSpectrumAccumulators(
  current: Float32Array,
  avg: Float32Array,
  peak: Float32Array,
  alpha = 0.25,
  peakDecay = 0.2
): void {
  const n = current.length;
  for (let i = 0; i < n; i++) {
    const val = current[i];
    avg[i] = avg[i] * (1 - alpha) + val * alpha;
    peak[i] = Math.max(val, peak[i] - peakDecay);
  }
}
