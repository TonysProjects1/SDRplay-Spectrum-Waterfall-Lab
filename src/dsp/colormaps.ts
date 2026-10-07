import { ColorMapName } from '../types/sdr';

export type RGBAColor = [number, number, number, number];

// 256-color lookup tables in ABGR format (little-endian uint32 for canvas ImageData)
const lutCache = new Map<ColorMapName, Uint32Array>();

function interpolateColor(
  stops: { pos: number; r: number; g: number; b: number }[],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (clamped >= s1.pos && clamped <= s2.pos) {
      const span = s2.pos - s1.pos;
      const f = span > 0 ? (clamped - s1.pos) / span : 0;
      return [
        Math.round(s1.r + (s2.r - s1.r) * f),
        Math.round(s1.g + (s2.g - s1.g) * f),
        Math.round(s1.b + (s2.b - s1.b) * f),
      ];
    }
  }
  const last = stops[stops.length - 1];
  return [last.r, last.g, last.b];
}

export function getColorLUT(name: ColorMapName): Uint32Array {
  if (lutCache.has(name)) {
    return lutCache.get(name)!;
  }

  const lut = new Uint32Array(256);
  let stops: { pos: number; r: number; g: number; b: number }[] = [];

  switch (name) {
    case 'turbo':
      stops = [
        { pos: 0.0, r: 48, g: 18, b: 59 },
        { pos: 0.2, r: 70, g: 134, b: 251 },
        { pos: 0.4, r: 27, g: 208, b: 183 },
        { pos: 0.6, r: 164, g: 252, b: 60 },
        { pos: 0.8, r: 251, g: 154, b: 33 },
        { pos: 1.0, r: 122, g: 4, b: 3 },
      ];
      break;

    case 'viridis':
      stops = [
        { pos: 0.0, r: 68, g: 1, b: 84 },
        { pos: 0.25, r: 59, g: 82, b: 139 },
        { pos: 0.5, r: 33, g: 145, b: 140 },
        { pos: 0.75, r: 94, g: 201, b: 98 },
        { pos: 1.0, r: 253, g: 231, b: 37 },
      ];
      break;

    case 'inferno':
      stops = [
        { pos: 0.0, r: 0, g: 0, b: 4 },
        { pos: 0.25, r: 87, g: 16, b: 110 },
        { pos: 0.5, r: 187, g: 55, b: 84 },
        { pos: 0.75, r: 249, g: 142, b: 9 },
        { pos: 1.0, r: 252, g: 255, b: 164 },
      ];
      break;

    case 'sdrsharp':
      // SDR# / GQRX classic: Deep blue -> Sky Blue -> Emerald -> Yellow -> Red -> White
      stops = [
        { pos: 0.0, r: 10, g: 15, b: 40 },
        { pos: 0.2, r: 20, g: 70, b: 170 },
        { pos: 0.4, r: 20, g: 180, b: 210 },
        { pos: 0.6, r: 40, g: 220, b: 50 },
        { pos: 0.8, r: 240, g: 210, b: 30 },
        { pos: 0.95, r: 235, g: 45, b: 30 },
        { pos: 1.0, r: 255, g: 255, b: 255 },
      ];
      break;

    case 'cyberpunk':
      stops = [
        { pos: 0.0, r: 15, g: 10, b: 35 },
        { pos: 0.3, r: 60, g: 15, b: 90 },
        { pos: 0.6, r: 190, g: 20, b: 160 },
        { pos: 0.85, r: 0, g: 230, b: 245 },
        { pos: 1.0, r: 255, g: 245, b: 180 },
      ];
      break;

    case 'emerald':
      stops = [
        { pos: 0.0, r: 5, g: 15, b: 10 },
        { pos: 0.3, r: 10, g: 60, b: 35 },
        { pos: 0.65, r: 20, g: 170, b: 85 },
        { pos: 0.9, r: 80, g: 255, b: 140 },
        { pos: 1.0, r: 230, g: 255, b: 230 },
      ];
      break;
  }

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const [r, g, b] = interpolateColor(stops, t);
    // In little-endian, RGBA buffer format as uint32 is (A << 24) | (B << 16) | (G << 8) | R
    lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }

  lutCache.set(name, lut);
  return lut;
}
