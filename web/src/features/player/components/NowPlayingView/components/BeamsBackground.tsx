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

const FIXED_TIME_STEP = 1;

/**
 * Animated beams background using the dominant color
 * Desktop: diagonal beams moving up
 * Mobile: subtle pulsing color blobs in the gradient area
 */
function BeamsBackgroundComponent({
  dominantColor,
  intensity = 'strong',
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);

  const getHueFromColor = useCallback((color: string): number => {
    const parts = color.split(',').map((p) => parseInt(p.trim(), 10));
    if (parts.length < 3 || parts.some((p) => isNaN(p))) {
      return 200;
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
    const isMobile = () => window.innerWidth <= 768;

    // Desktop: diagonal beams
    const createDesktopBeam = (width: number, height: number): Beam => {
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

    // Mobile: static blobs that only pulse in opacity - positioned in top 45% where gradient color is
    const createMobileBlob = (width: number, height: number): Beam => {
      return {
        x: width * 0.1 + Math.random() * width * 0.8, // 10%-90% of width
        y: height * 0.05 + Math.random() * height * 0.4, // 5%-45% of height (gradient area only)
        width: 100 + Math.random() * 150,
        length: 100 + Math.random() * 150,
        angle: Math.random() * 360,
        speed: 0,
        opacity: 0.12 + Math.random() * 0.1,
        hue: baseHue + (Math.random() - 0.5) * 40,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.006 + Math.random() * 0.01,
      };
    };

    const resetDesktopBeam = (beam: Beam, index: number, totalBeams: number): Beam => {
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

    const drawDesktopBeam = (beam: Beam) => {
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

    // Mobile: draw soft radial blob
    const drawMobileBlob = (beam: Beam) => {
      ctx.save();

      // Pulsing opacity - fades in and out smoothly
      const pulsingOpacity = beam.opacity * (0.3 + Math.sin(beam.pulse) * 0.7) * intensityMultiplier;

      const gradient = ctx.createRadialGradient(
        beam.x, beam.y, 0,
        beam.x, beam.y, beam.width
      );

      const saturation = '70%';
      const lightness = '55%';

      gradient.addColorStop(0, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`);
      gradient.addColorStop(0.5, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(beam.x - beam.width, beam.y - beam.width, beam.width * 2, beam.width * 2);
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

      const mobile = isMobile();
      const totalBeams = mobile ? 12 : Math.floor(MINIMUM_BEAMS * 1.5); // 12 blobs on mobile

      beamsRef.current = Array.from({ length: totalBeams }, () =>
        mobile
          ? createMobileBlob(width, height)
          : createDesktopBeam(canvas.width, canvas.height)
      );
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const animate = () => {
      if (!canvas || !ctx) return;

      const mobile = isMobile();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = mobile ? 'blur(40px)' : 'blur(35px)'; // Slightly less blur on mobile for visibility

      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        beam.pulse += beam.pulseSpeed * FIXED_TIME_STEP;

        if (mobile) {
          // Mobile: just pulse, no movement
          drawMobileBlob(beam);
        } else {
          // Desktop: move up
          beam.y -= beam.speed * FIXED_TIME_STEP;
          if (beam.y + beam.length < -100) {
            resetDesktopBeam(beam, index, totalBeams);
          }
          drawDesktopBeam(beam);
        }
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

export const BeamsBackground = memo(BeamsBackgroundComponent);
