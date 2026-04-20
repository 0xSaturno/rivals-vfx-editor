import type { RGBA, RGBNormalized } from '@/types';

/**
 * Convert RGBA (potentially HDR, values > 1.0) to a displayable hex string.
 * Normalizes by the max channel so the hue is preserved visually.
 */
export function rgbaToDisplayHex(r: number, g: number, b: number): string {
  const maxVal = Math.max(r, g, b, 1.0);
  const normR = r / maxVal;
  const normG = g / maxVal;
  const normB = b / maxVal;

  const toHex = (c: number): string => {
    const numC = Number.isNaN(c) ? 0 : Number(c);
    const hex = Math.round(numC * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(normR)}${toHex(normG)}${toHex(normB)}`;
}

/**
 * Convert a hex color string (#RGB or #RRGGBB) to normalized 0–1 RGB.
 */
export function hexToRgba(hex: string): RGBNormalized {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Convert (potentially HDR) RGB to HSL, normalizing first.
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const maxVal = Math.max(r, g, b, 1.0);
  if (maxVal === 0) return [0, 0, 0];
  const r_norm = r / maxVal;
  const g_norm = g / maxVal;
  const b_norm = b / maxVal;

  const max = Math.max(r_norm, g_norm, b_norm);
  const min = Math.min(r_norm, g_norm, b_norm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
      case g_norm: h = (b_norm - r_norm) / d + 2; break;
      case b_norm: h = (r_norm - g_norm) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/**
 * Convert HSL back to normalized 0–1 RGB.
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

/**
 * Apply a new color to a param, respecting intensity preservation and grayscale ignoring.
 */
export function applyColorToParam(
  currentRgba: RGBA,
  newColor: RGBNormalized,
  options: {
    preserveIntensity: boolean;
    ignoreGrayscale: boolean;
    ignoreGrayscaleCheck?: boolean;
  }
): RGBA {
  const isGrayscale = currentRgba.R === currentRgba.G && currentRgba.G === currentRgba.B;

  if (!options.ignoreGrayscaleCheck && options.ignoreGrayscale && isGrayscale) {
    console.debug('[applyColorToParam] Skipping grayscale param', { currentRgba });
    return currentRgba;
  }

  if (options.preserveIntensity) {
    const originalIntensity = Math.max(currentRgba.R, currentRgba.G, currentRgba.B);
    if (originalIntensity === 0) return { ...currentRgba, R: 0, G: 0, B: 0 };

    const maxNew = Math.max(newColor.r, newColor.g, newColor.b);
    if (maxNew === 0) return { ...currentRgba, R: 0, G: 0, B: 0 };

    const normalizedNewR = newColor.r / maxNew;
    const normalizedNewG = newColor.g / maxNew;
    const normalizedNewB = newColor.b / maxNew;

    return {
      ...currentRgba,
      R: normalizedNewR * originalIntensity,
      G: normalizedNewG * originalIntensity,
      B: normalizedNewB * originalIntensity,
    };
  } else {
    return { ...currentRgba, R: newColor.r, G: newColor.g, B: newColor.b };
  }
}

/**
 * Apply a hue shift (in degrees) to an RGBA value.
 */
export function applyHueShiftToRgba(
  rgba: RGBA,
  hueShiftDegrees: number,
  ignoreGrayscale: boolean
): RGBA {
  const isGrayscale = rgba.R === rgba.G && rgba.G === rgba.B;
  if (ignoreGrayscale && isGrayscale) return rgba;

  const originalIntensity = Math.max(rgba.R, rgba.G, rgba.B);
  const [h, s, l] = rgbToHsl(rgba.R, rgba.G, rgba.B);

  let newHue = h + (hueShiftDegrees / 360);
  if (newHue < 0) newHue += 1;
  if (newHue > 1) newHue -= 1;

  const [r, g, b] = hslToRgb(newHue, s, l);

  return {
    ...rgba,
    R: r * originalIntensity,
    G: g * originalIntensity,
    B: b * originalIntensity,
  };
}

/**
 * Check if a hex color string is valid.
 */
export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}
