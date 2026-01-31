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
  subtle: 0.5,
  medium: 0.65,
  strong: 0.8,
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

    const createBeam = (width: number, height: number): Beam => {
      const angle = -35 + Math.random() * 10; // Diagonal angle like original
      return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle,
        speed: 0.08 + Math.random() * 0.12, // Slow speed
        opacity: 0.08 + Math.random() * 0.12,
        hue: baseHue + (Math.random() - 0.5) * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.005,
      };
    };

    const resetBeam = (beam: Beam, index: number, totalBeams: number): Beam => {
      const column = index % 3;
      const spacing = canvas.width / 3;

      beam.y = canvas.height + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.06 + Math.random() * 0.08;
      beam.hue = baseHue + ((index * 70) / totalBeams - 35);
      beam.opacity = 0.1 + Math.random() * 0.08;
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

      const totalBeams = Math.floor(MINIMUM_BEAMS * 1.5);
      beamsRef.current = Array.from({ length: totalBeams }, () =>
        createBeam(canvas.width, canvas.height)
      );
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Use fixed time step for consistent animation
    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(35px)';

      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        // Fixed time step for consistent movement regardless of frame rate
        beam.y -= beam.speed * FIXED_TIME_STEP;
        beam.pulse += beam.pulseSpeed * FIXED_TIME_STEP;

        if (beam.y + beam.length < -100) {
          resetBeam(beam, index, totalBeams);
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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        filter: 'blur(15px)',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// Memoize to prevent re-renders when parent updates (e.g., progress bar)
export const BeamsBackground = memo(BeamsBackgroundComponent);
