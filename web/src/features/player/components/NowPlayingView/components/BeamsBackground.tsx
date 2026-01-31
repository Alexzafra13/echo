import { useEffect, useRef, useCallback, memo } from 'react';

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

interface BeamsBackgroundProps {
  /** RGB color string like "255, 100, 50" */
  dominantColor: string;
  /** Intensity of the beams effect */
  intensity?: 'subtle' | 'medium' | 'strong';
}

// Constants outside component to prevent recreation
const MINIMUM_BEAMS = 20;
const OPACITY_MAP = {
  subtle: 0.6,
  medium: 0.8,
  strong: 1.0,
} as const;

// Fixed time step for consistent animation regardless of frame rate
const FIXED_TIME_STEP = 1;

/**
 * Animated beams background using the dominant color
 * Based on kokonutui/beams-background
 */
function BeamsBackgroundComponent({
  dominantColor,
  intensity = 'strong',
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Parse RGB and convert to HSL for hue extraction
  const getHueFromColor = useCallback((color: string): number => {
    const parts = color.split(',').map((p) => parseInt(p.trim(), 10));
    if (parts.length < 3 || parts.some((p) => isNaN(p))) {
      return 200; // Fallback hue (blue-ish)
    }
    const [r, g, b] = parts.map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;

    if (max !== min) {
      const d = max - min;
      if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) hue = ((b - r) / d + 2) * 60;
      else hue = ((r - g) / d + 4) * 60;
    }
    return hue;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseHue = getHueFromColor(dominantColor);
    const intensityMultiplier = OPACITY_MAP[intensity];

    // Check if mobile/portrait mode (height > width)
    const isMobile = () => window.innerWidth <= 768;

    const createBeam = (width: number, height: number): Beam => {
      const mobile = isMobile();

      if (mobile) {
        // Mobile: horizontal moving color blobs in the gradient area
        return {
          x: Math.random() * width * 1.2 - width * 0.1,
          y: Math.random() * height * 0.8, // Stay in top 80% of canvas
          width: 80 + Math.random() * 120, // Wider blobs
          length: 150 + Math.random() * 200, // Shorter, more blob-like
          angle: 60 + Math.random() * 60, // Mostly horizontal (60-120 degrees)
          speed: 0.15 + Math.random() * 0.25, // Slower horizontal movement
          opacity: 0.12 + Math.random() * 0.1,
          hue: baseHue + (Math.random() - 0.5) * 50,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.008 + Math.random() * 0.012,
        };
      }

      // Desktop: diagonal beams moving up
      const angle = -35 + Math.random() * 10;
      return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.15,
        hue: baseHue + (Math.random() - 0.5) * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.015,
      };
    };

    const resetBeam = (beam: Beam, index: number, totalBeams: number): Beam => {
      const mobile = isMobile();

      if (mobile) {
        // Mobile: reset to left side, random vertical position in gradient area
        beam.x = -beam.width;
        beam.y = Math.random() * canvas.height * 0.8;
        beam.speed = 0.15 + Math.random() * 0.25;
        beam.hue = baseHue + (Math.random() - 0.5) * 50;
        beam.opacity = 0.12 + Math.random() * 0.1;
        return beam;
      }

      // Desktop: reset to bottom
      const columns = 3;
      const column = index % columns;
      const spacing = canvas.width / columns;

      beam.y = canvas.height + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.6;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.25 + Math.random() * 0.4;
      beam.hue = baseHue + ((index * 70) / totalBeams - 35);
      beam.opacity = 0.15 + Math.random() * 0.12;
      return beam;
    };

    const drawBeam = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * intensityMultiplier;

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      const saturation = '80%';
      const lightness = '60%';

      gradient.addColorStop(0, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);
      gradient.addColorStop(0.1, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(0.4, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`);
      gradient.addColorStop(0.6, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`);
      gradient.addColorStop(0.9, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;

      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Fewer blobs on mobile (they're bigger), more beams on desktop
      const mobile = isMobile();
      const totalBeams = Math.floor(MINIMUM_BEAMS * (mobile ? 0.8 : 1.5));
      beamsRef.current = Array.from({ length: totalBeams }, () =>
        createBeam(canvas.width, canvas.height)
      );
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Use fixed time step for consistent animation
    const animate = () => {
      if (!canvas || !ctx) return;

      const mobile = isMobile();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = mobile ? 'blur(40px)' : 'blur(35px)'; // More blur on mobile for softer blobs

      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        beam.pulse += beam.pulseSpeed * FIXED_TIME_STEP;

        if (mobile) {
          // Mobile: move horizontally
          beam.x += beam.speed * FIXED_TIME_STEP;
          if (beam.x > canvas.width + 50) {
            resetBeam(beam, index, totalBeams);
          }
        } else {
          // Desktop: move vertically (up)
          beam.y -= beam.speed * FIXED_TIME_STEP;
          if (beam.y + beam.length < -100) {
            resetBeam(beam, index, totalBeams);
          }
        }

        drawBeam(beam);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dominantColor, intensity, getHueFromColor]);

  // On mobile, only cover the top portion where the color gradient is
  const isMobileView = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: isMobileView ? '55%' : '100%', // Only top 55% on mobile
        filter: 'blur(15px)',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// Memoize to prevent re-renders when parent updates (e.g., progress bar)
export const BeamsBackground = memo(BeamsBackgroundComponent);
