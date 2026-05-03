import { useRef, useEffect, useState } from 'react';
import type { Transmission } from '@leviathan/shared';

interface Props {
  transmissions: Transmission[];
  commsLevel: number;
  onSelect: (tx: Transmission) => void;
  selectedId: string | null;
}

const FACTION_COLORS: Record<string, string> = {
  corporate: '#4fc3f7',
  researcher: '#81c784',
  distress: '#e74c3c',
  leviathan: '#ce93d8',
};

export function WaveformDisplay({ transmissions, commsLevel, onSelect, selectedId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const [size, setSize] = useState({ w: 400, h: 120 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setSize({ w: Math.max(200, width), h: 120 });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.scale(dpr, dpr);

    function draw() {
      if (!ctx) return;
      const { w, h } = size;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0f1923';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Static noise (affected by comms level)
      if (commsLevel <= 1) {
        const noiseIntensity = commsLevel === 0 ? 0.3 : 0.1;
        for (let i = 0; i < w * noiseIntensity; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          ctx.fillStyle = `rgba(79, 195, 247, ${Math.random() * 0.3})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw waveforms for each active transmission
      const channelHeight = Math.min(30, h / Math.max(transmissions.length, 3));
      const t = Date.now() / 1000;

      transmissions.forEach((tx, i) => {
        const y = 15 + i * channelHeight;
        const color = FACTION_COLORS[tx.faction] || '#4fc3f7';
        const isSelected = selectedId === tx.id;
        const amplitude = tx.decoded ? 4 : 8 + Math.sin(t * 3 + i) * 3;
        const freq = tx.encrypted ? 0.08 + Math.sin(t + i) * 0.02 : 0.04;

        // Channel label
        ctx.font = '8px monospace';
        ctx.fillStyle = `${color}66`;
        ctx.textAlign = 'left';
        ctx.fillText(`CH${tx.channel}`, 2, y + 3);

        // Waveform
        ctx.strokeStyle = isSelected ? color : `${color}88`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.shadowColor = isSelected ? color : 'transparent';
        ctx.shadowBlur = isSelected ? 6 : 0;

        ctx.beginPath();
        for (let x = 30; x < w - 5; x++) {
          const wave = Math.sin((x * freq) + t * (2 + i * 0.5)) * amplitude;
          const noise = tx.encrypted ? (Math.random() - 0.5) * 3 : 0;
          const val = y + wave + noise;
          if (x === 30) ctx.moveTo(x, val);
          else ctx.lineTo(x, val);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Status indicator
        const statusX = w - 12;
        ctx.fillStyle = tx.decoded ? '#2ecc71' : tx.encrypted ? '#f1c40f' : '#2ecc71';
        ctx.beginPath();
        ctx.arc(statusX, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Comms power indicator
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
      ctx.textAlign = 'right';
      ctx.fillText(`COMMS: ${['OFF', 'LOW', 'MED', 'HIGH'][commsLevel]}`, w - 4, h - 4);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [size, transmissions, commsLevel, selectedId]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const channelHeight = Math.min(30, size.h / Math.max(transmissions.length, 3));

    const idx = Math.floor((y - 5) / channelHeight);
    if (idx >= 0 && idx < transmissions.length) {
      onSelect(transmissions[idx]);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: size.w,
          height: size.h,
          cursor: 'pointer',
          borderRadius: 4,
          border: '1px solid rgba(79, 195, 247, 0.1)',
        }}
      />
    </div>
  );
}
