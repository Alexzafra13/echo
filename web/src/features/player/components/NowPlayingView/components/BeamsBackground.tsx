import { useEffect, useRef, useCallback } from 'react';

interface Beam {
  x: number;
  width: number;
  speed: number;
  opacity: number;
  hue: number;
  pulseSpeed: number;
  pulsePhase: number;
  y: number;
}

interface BeamsBackgroundProps {
  /** RGB color string like "255, 100, 50" */
  dominantColor: string;
  /** Intensity of the beams effect */
  intensity?: 'subtle' | 'medium' | 'strong';
  /** Background color - defaults to transparent */
  backgroundColor?: string;
}

/**
 * Animated beams background using the dominant color
 * Inspired by kokonutui/beams-background
 */
export function BeamsBackground({
  dominantColor,
  intensity = 'medium',
  backgroundColor = 'transparent',
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Configuration based on intensity
  const config = {
    subtle: { beamCount: 10, maxOpacity: 0.4, blur: 40 },
    medium: { beamCount: 15, maxOpacity: 0.6, blur: 30 },
    strong: { beamCount: 20, maxOpacity: 0.8, blur: 20 },
  }[intensity];

  // Parse RGB from dominant color
  const parseColor = useCallback((color: string): [number, number, number] => {
    const parts = color.split(',').map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
      return [parts[0], parts[1], parts[2]];
    }
    return [237, 104, 66]; // Fallback to primary color
  }, []);

  // Create a new beam
  const createBeam = useCallback(
    (canvasWidth: number, canvasHeight: number, index: number): Beam => {
      const [r, g, b] = parseColor(dominantColor);
      // Calculate hue from RGB for variation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let hue = 0;
      if (max !== min) {
        const d = max - min;
        if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) hue = ((b - r) / d + 2) * 60;
        else hue = ((r - g) / d + 4) * 60;
      }

      return {
        x: Math.random() * canvasWidth,
        width: 80 + Math.random() * 150, // Wider beams
        speed: 0.5 + Math.random() * 1, // Faster movement
        opacity: 0.2 + Math.random() * config.maxOpacity,
        hue: hue + (Math.random() - 0.5) * 40, // More hue variation
        pulseSpeed: 0.3 + Math.random() * 0.7,
        pulsePhase: Math.random() * Math.PI * 2,
        y: canvasHeight + Math.random() * 200 + index * 80,
      };
    },
    [dominantColor, config.maxOpacity, parseColor]
  );

  // Initialize beams
  const initBeams = useCallback(
    (width: number, height: number) => {
      beamsRef.current = Array.from({ length: config.beamCount }, (_, i) =>
        createBeam(width, height, i)
      );
    },
    [config.beamCount, createBeam]
  );

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const { width, height } = parent.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = width * dpr;
          canvasRef.current.height = height * dpr;
          canvasRef.current.style.width = `${width}px`;
          canvasRef.current.style.height = `${height}px`;
          initBeams(width * dpr, height * dpr);
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [initBeams]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16; // Normalize to ~60fps
      lastTime = currentTime;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Optional background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw beams
      beamsRef.current.forEach((beam, index) => {
        // Update position (move up)
        beam.y -= beam.speed * deltaTime;
        beam.pulsePhase += beam.pulseSpeed * 0.02 * deltaTime;

        // Reset beam when it goes off screen
        if (beam.y + canvas.height < 0) {
          beamsRef.current[index] = createBeam(canvas.width, canvas.height, index);
          beamsRef.current[index].y = canvas.height + 50;
        }

        // Calculate pulsing opacity
        const pulseOpacity = beam.opacity * (0.7 + 0.3 * Math.sin(beam.pulsePhase));

        // Create gradient for beam
        const gradient = ctx.createLinearGradient(
          beam.x,
          beam.y,
          beam.x,
          beam.y - canvas.height * 1.5
        );

        // Use dominant color with hue shift - brighter, more saturated
        const hueShift = Math.sin(beam.pulsePhase * 0.5) * 15;
        const saturation = 80 + Math.sin(beam.pulsePhase) * 15;
        const lightness = 60 + Math.sin(beam.pulsePhase * 0.7) * 20;

        gradient.addColorStop(0, `hsla(${beam.hue + hueShift}, ${saturation}%, ${lightness}%, 0)`);
        gradient.addColorStop(0.15, `hsla(${beam.hue + hueShift}, ${saturation}%, ${lightness}%, ${pulseOpacity * 0.7})`);
        gradient.addColorStop(0.5, `hsla(${beam.hue + hueShift}, ${saturation}%, ${lightness}%, ${pulseOpacity})`);
        gradient.addColorStop(0.85, `hsla(${beam.hue + hueShift}, ${saturation}%, ${lightness}%, ${pulseOpacity * 0.7})`);
        gradient.addColorStop(1, `hsla(${beam.hue + hueShift}, ${saturation}%, ${lightness}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(beam.x - beam.width / 2, beam.y - canvas.height * 1.5, beam.width, canvas.height * 1.5);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dominantColor, backgroundColor, createBeam, parseColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: `blur(${config.blur}px)`,
        opacity: 1,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
