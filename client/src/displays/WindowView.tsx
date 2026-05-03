import { useRef, useEffect, useState } from 'react';

interface Props {
  depth: number;
  velocity: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  hue: number;
  drift: number;
}

export function WindowView({ depth, velocity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef(0);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: Math.max(200, width), h: Math.max(150, height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * size.w,
        y: Math.random() * size.h,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        hue: 180 + Math.random() * 40, // cyan-blue range
        drift: (Math.random() - 0.5) * 0.3,
      });
    }
    particlesRef.current = particles;
  }, [size.w, size.h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.scale(dpr, dpr);

    const { w, h } = size;

    function draw() {
      if (!ctx) return;

      // Depth-based gradient
      const depthPct = Math.min(1, depth / 500);
      const skyBright = Math.max(0, 0.15 - depthPct * 0.14);

      // Background gradient — darker with depth
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgba(${10 + (1 - depthPct) * 20}, ${20 + (1 - depthPct) * 40}, ${40 + (1 - depthPct) * 60}, 1)`);
      grad.addColorStop(0.5, `rgba(${5 + (1 - depthPct) * 8}, ${12 + (1 - depthPct) * 15}, ${25 + (1 - depthPct) * 30}, 1)`);
      grad.addColorStop(1, `rgba(2, 5, 12, 1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Light rays from above (only in shallow water)
      if (depthPct < 0.5) {
        const rayOpacity = (0.5 - depthPct) * 0.15;
        const t = Date.now() / 3000;
        for (let i = 0; i < 5; i++) {
          const x = w * (0.2 + i * 0.15) + Math.sin(t + i) * 20;
          const rayGrad = ctx.createLinearGradient(x - 30, 0, x + 30, h);
          rayGrad.addColorStop(0, `rgba(100, 200, 255, ${rayOpacity})`);
          rayGrad.addColorStop(1, `rgba(100, 200, 255, 0)`);
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(x - 15, 0);
          ctx.lineTo(x + 15, 0);
          ctx.lineTo(x + 40, h);
          ctx.lineTo(x - 40, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Particles (marine snow, plankton, bioluminescence)
      const particles = particlesRef.current;
      const speedMult = 1 + velocity * 2;

      for (const p of particles) {
        // Move
        p.y += p.speed * speedMult;
        p.x += p.drift + Math.sin(Date.now() / 2000 + p.x) * 0.2;

        // Wrap
        if (p.y > h + 5) { p.y = -5; p.x = Math.random() * w; }
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;

        // Bioluminescence in deep water
        const bioGlow = depthPct > 0.4 ? (depthPct - 0.4) * 2 : 0;
        const glowPulse = bioGlow > 0 ? Math.sin(Date.now() / 800 + p.x + p.y) * 0.3 : 0;

        ctx.fillStyle = `hsla(${p.hue + bioGlow * 60}, ${60 + bioGlow * 30}%, ${60 + bioGlow * 30}%, ${p.opacity + glowPulse})`;

        if (bioGlow > 0.3 && p.size > 2) {
          // Glowing particles in deep water
          ctx.shadowColor = `hsla(${p.hue + 40}, 80%, 70%, 0.5)`;
          ctx.shadowBlur = p.size * 3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Occasional large bioluminescent entity in deep water
      if (depthPct > 0.3) {
        const entityT = Date.now() / 5000;
        const entityX = w * 0.5 + Math.sin(entityT) * w * 0.3;
        const entityY = h * 0.4 + Math.cos(entityT * 0.7) * h * 0.2;
        const pulse = (Math.sin(entityT * 3) + 1) / 2;
        const entityOpacity = depthPct * 0.08 * pulse;

        const entityGrad = ctx.createRadialGradient(entityX, entityY, 0, entityX, entityY, 60);
        entityGrad.addColorStop(0, `rgba(100, 200, 255, ${entityOpacity})`);
        entityGrad.addColorStop(0.5, `rgba(150, 100, 255, ${entityOpacity * 0.5})`);
        entityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = entityGrad;
        ctx.fillRect(entityX - 60, entityY - 60, 120, 120);
      }

      // Vignette
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      // Hull frame overlay — porthole feel
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
      ctx.lineWidth = 3;
      const frameR = Math.min(w, h) * 0.46;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, frameR, 0, Math.PI * 2);
      ctx.stroke();

      // Outer frame shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, frameR + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Rivet details on frame
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 * Math.PI) / 180;
        const rx = w / 2 + (frameR + 5) * Math.cos(angle);
        const ry = h / 2 + (frameR + 5) * Math.sin(angle);
        ctx.fillStyle = 'rgba(201, 168, 76, 0.2)';
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Depth label
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(201, 168, 76, 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(`DEPTH: ${depth.toFixed(0)}m`, w / 2, h - 15);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [size, depth, velocity]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#020510',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size.w,
          height: size.h,
        }}
      />
    </div>
  );
}
