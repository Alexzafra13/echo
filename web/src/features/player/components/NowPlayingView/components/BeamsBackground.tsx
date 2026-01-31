import { useEffect, useRef, useCallback } from 'react';

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

/**
 * Animated beams background using the dominant color
 * Based on kokonutui/beams-background
 */
export function BeamsBackground({
  dominantColor,
  intensity = 'strong',
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const MINIMUM_BEAMS = 20;

  const opacityMap = {
    subtle: 0.5,
    medium: 0.65,
    strong: 0.8,
  };

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

    const createBeam = (width: number, height: number): Beam => {
      const angle = -35 + Math.random() * 10; // Diagonal angle like original
      return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle,
        speed: 0.08 + Math.random() * 0.12, // Much slower speed
        opacity: 0.08 + Math.random() * 0.12,
        hue: baseHue + (Math.random() - 0.5) * 70, // Variation around dominant color
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.005, // Slower pulse
      };
    };

    const resetBeam = (beam: Beam, index: number, totalBeams: number): Beam => {
      const column = index % 3;
      const spacing = canvas.width / 3;

      beam.y = canvas.height + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.06 + Math.random() * 0.08; // Much slower speed
      beam.hue = baseHue + ((index * 70) / totalBeams - 35);
      beam.opacity = 0.1 + Math.random() * 0.08;
      return beam;
    };

    const drawBeam = (ctx: CanvasRenderingContext2D, beam: Beam, intensityMultiplier: number) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * intensityMultiplier;

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

      // Use high saturation and lightness for visibility
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

    const intensityMultiplier = opacityMap[intensity];

    const animate = (currentTime: number) => {
      if (!canvas || !ctx) return;

      // Calculate delta time for smooth animation
      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 16.67 : 1; // Normalize to ~60fps
      lastTimeRef.current = currentTime;

      // Cap delta time to prevent jumps when tab is inactive
      const cappedDelta = Math.min(deltaTime, 2);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(35px)'; // Blur applied to context like original

      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed * cappedDelta;
        beam.pulse += beam.pulseSpeed * cappedDelta;

        // Reset beam when it goes off screen
        if (beam.y + beam.length < -100) {
          resetBeam(beam, index, totalBeams);
        }

        drawBeam(ctx, beam, intensityMultiplier);
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
        filter: 'blur(15px)', // Additional CSS blur like original
        zIndex: 0, // Behind content (rendered before content in DOM)
        pointerEvents: 'none',
      }}
    />
  );
}
