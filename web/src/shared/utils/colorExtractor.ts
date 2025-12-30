/**
 * Color extraction utilities inspired by Spotify's approach
 * Uses simplified k-means clustering and color vibrancy detection
 */

import { logger } from './logger';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Calculate color vibrancy score
 * Prioritizes saturated colors over grays/blacks/whites
 */
function getVibrancyScore(rgb: RGB): number {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Penalize very light or very dark colors
  const lightnessScore = 1 - Math.abs(hsl.l - 50) / 50;

  // Reward high saturation
  const saturationScore = hsl.s / 100;

  return saturationScore * 0.7 + lightnessScore * 0.3;
}

/**
 * Simplified k-means clustering for color extraction
 * Groups similar colors and finds the most vibrant cluster
 */
function findVibrantColor(pixels: RGB[]): RGB {
  if (pixels.length === 0) {
    return { r: 255, g: 107, b: 107 }; // Fallback
  }

  // Group similar colors (simplified clustering)
  const colorMap = new Map<string, { count: number; rgb: RGB; vibrancy: number }>();

  for (const pixel of pixels) {
    // Round to reduce variation (creates color buckets)
    const r = Math.round(pixel.r / 15) * 15;
    const g = Math.round(pixel.g / 15) * 15;
    const b = Math.round(pixel.b / 15) * 15;
    const key = `${r},${g},${b}`;

    if (!colorMap.has(key)) {
      colorMap.set(key, {
        count: 0,
        rgb: { r, g, b },
        vibrancy: getVibrancyScore({ r, g, b })
      });
    }

    const entry = colorMap.get(key)!;
    entry.count++;
  }

  // Find the most vibrant color among the most common ones
  const colors = Array.from(colorMap.values());

  // Filter: only keep colors with reasonable frequency (top 30%)
  const threshold = Math.max(...colors.map(c => c.count)) * 0.3;
  const frequentColors = colors.filter(c => c.count >= threshold);

  // From frequent colors, pick the most vibrant
  let bestColor = frequentColors[0] || colors[0];
  for (const color of frequentColors) {
    if (color.vibrancy > bestColor.vibrancy) {
      bestColor = color;
    }
  }

  return bestColor.rgb;
}

/**
 * Extract dominant vibrant color from an image (Spotify-like)
 * Returns RGB color as string: "r, g, b"
 */
export async function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    // For local API images, fetch as blob first to avoid CORS issues
    // Detect: /api/, /uploads/, localhost, or current origin paths
    const isLocalApiImage =
      imageSrc.startsWith('/api/') ||
      imageSrc.startsWith('/uploads/') ||
      imageSrc.includes('localhost:3000') ||
      imageSrc.includes('localhost:5173') ||
      (imageSrc.startsWith('http') && imageSrc.includes(window.location.host));

    if (isLocalApiImage) {
      // Fetch the image as blob to avoid CORS issues with canvas
      // Note: Not using credentials since images are public resources
      fetch(imageSrc)
        .then(response => response.blob())
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          loadImageAndExtractColor(objectUrl, resolve, () => {
            URL.revokeObjectURL(objectUrl);
          });
        })
        .catch(() => {
          resolve('64, 71, 114'); // Dark blue fallback
        });
    } else {
      // For external images (like radio favicons), use crossOrigin
      loadImageAndExtractColor(imageSrc, resolve);
    }
  });
}

/**
 * Helper function to load image and extract color
 */
function loadImageAndExtractColor(
  imageSrc: string,
  resolve: (value: string) => void,
  onComplete?: () => void
) {
  const img = new Image();

  // Only set crossOrigin for external URLs
  if (!imageSrc.startsWith('blob:')) {
    img.crossOrigin = 'Anonymous';
  }

  img.onload = () => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        resolve('64, 71, 114'); // Dark blue fallback
        onComplete?.();
        return;
      }

      // Resize for performance (100x100 like Spotify's approach)
      const size = 100;
      canvas.width = size;
      canvas.height = size;

      // Draw image
      ctx.drawImage(img, 0, 0, size, size);

      // Get image data
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Extract non-background pixels
      const pixels: RGB[] = [];

      // Sample pixels (skip every 2 pixels for performance)
      for (let i = 0; i < data.length; i += 8) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 125) continue;

        // Skip near-white pixels (often background)
        if (r > 240 && g > 240 && b > 240) continue;

        // Skip near-black pixels (often shadows/borders)
        if (r < 15 && g < 15 && b < 15) continue;

        pixels.push({ r, g, b });
      }

      // Find vibrant color using simplified k-means
      const vibrantColor = findVibrantColor(pixels);

      // Boost saturation and lightness for better visual effect
      const boosted = boostColorForDisplay(vibrantColor);

      const colorString = `${boosted.r}, ${boosted.g}, ${boosted.b}`;
      resolve(colorString);
      onComplete?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error extracting color:', error);
      }
      resolve('64, 71, 114'); // Dark blue fallback
      onComplete?.();
    }
  };

  img.onerror = () => {
    resolve('64, 71, 114'); // Dark blue fallback
    onComplete?.();
  };

  // Try to load with CORS support for external images
  // If CORS fails, onerror handler will use fallback color
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;
}

/**
 * Boost color for better display in UI - increase saturation and lightness
 * Especially important for dark colors that would be invisible in gradients
 */
function boostColorForDisplay(rgb: RGB): RGB {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Boost saturation
  hsl.s = Math.min(100, hsl.s * 1.3);

  // Boost lightness for dark colors to make them more visible
  // If lightness is below 30%, boost it to at least 35-45%
  if (hsl.l < 30) {
    hsl.l = Math.min(45, hsl.l + 20);
  } else if (hsl.l < 50) {
    // For medium-dark colors, boost slightly
    hsl.l = Math.min(55, hsl.l + 10);
  }

  // Convert back to RGB
  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

