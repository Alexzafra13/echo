/**
 * Extract dominant color from an image using Canvas API
 * Returns RGB color as string: "r, g, b"
 */
export async function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('255, 107, 107'); // Fallback color
        return;
      }

      // Set canvas size (smaller for better performance)
      const size = 100;
      canvas.width = size;
      canvas.height = size;

      // Draw image
      ctx.drawImage(img, 0, 0, size, size);

      // Get image data
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Count colors
      const colorCount: Record<string, number> = {};

      // Sample every 4 pixels for performance
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent and very dark/light pixels
        if (a < 125 || (r > 250 && g > 250 && b > 250) || (r < 10 && g < 10 && b < 10)) {
          continue;
        }

        // Round colors to reduce variations
        const roundedR = Math.round(r / 10) * 10;
        const roundedG = Math.round(g / 10) * 10;
        const roundedB = Math.round(b / 10) * 10;
        const colorKey = `${roundedR},${roundedG},${roundedB}`;

        colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
      }

      // Find most common color
      let maxCount = 0;
      let dominantColor = '255, 107, 107'; // Fallback

      for (const [color, count] of Object.entries(colorCount)) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = color;
        }
      }

      resolve(dominantColor);
    };

    img.onerror = () => {
      resolve('255, 107, 107'); // Fallback color
    };

    img.src = imageSrc;
  });
}

/**
 * Get a vibrant/saturated version of a color
 */
export function getVibrantColor(rgb: string): string {
  const [r, g, b] = rgb.split(',').map(n => parseInt(n.trim()));

  // Increase saturation
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return rgb; // Grayscale, return as is

  // Boost saturation by 30%
  const boost = 1.3;
  const newR = Math.min(255, Math.round(r + (r - min) * boost * 0.3));
  const newG = Math.min(255, Math.round(g + (g - min) * boost * 0.3));
  const newB = Math.min(255, Math.round(b + (b - min) * boost * 0.3));

  return `${newR}, ${newG}, ${newB}`;
}
