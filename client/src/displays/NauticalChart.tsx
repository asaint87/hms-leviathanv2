import { useRef, useEffect, useCallback, useState } from 'react';
import type { WorldState, Waypoint, Current } from '@leviathan/shared';

interface Props {
  sub: WorldState['sub'];
  navigation: WorldState['navigation'];
  enginePower: number;
  onPlotCourse: (waypoints: { x: number; y: number }[]) => void;
  onAdjustDepth: (depth: number) => void;
  onDropBeacon: (x: number, y: number) => void;
  readOnly?: boolean;
}

const CELL_SIZE = 50; // world units per fog cell
const SCALE = 0.8;    // pixels per world unit (adjustable via zoom)

const WAYPOINT_COLORS: Record<string, string> = {
  mission: '#e74c3c',
  safe_harbor: '#2ecc71',
  poi: '#f1c40f',
  beacon: '#9b59b6',
};

const WAYPOINT_SYMBOLS: Record<string, string> = {
  mission: '\u2316',     // target
  safe_harbor: '\u2693', // anchor
  poi: '\u2605',         // star
  beacon: '\u25C9',      // fisheye
};

export function NauticalChart({
  sub,
  navigation,
  enginePower,
  onPlotCourse,
  onAdjustDepth,
  onDropBeacon,
  readOnly = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 300 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const animRef = useRef(0);
  const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: Math.max(200, width), h: Math.max(150, height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Follow sub
  useEffect(() => {
    setCamera({
      x: sub.position.x * SCALE,
      y: sub.position.y * SCALE,
    });
  }, [sub.position.x, sub.position.y]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    const { w, h } = canvasSize;
    const halfW = w / 2;
    const halfH = h / 2;

    function worldToScreen(wx: number, wy: number) {
      return {
        x: halfW + (wx * SCALE - camera.x),
        y: halfH + (wy * SCALE - camera.y),
      };
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Background — deep ocean
      ctx.fillStyle = '#0d2b2b';
      ctx.fillRect(0, 0, w, h);

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(212, 168, 85, 0.05)';
      ctx.lineWidth = 1;
      const gridSpacing = CELL_SIZE * SCALE;
      const startGridX = Math.floor((camera.x - halfW) / gridSpacing) * gridSpacing;
      const startGridY = Math.floor((camera.y - halfH) / gridSpacing) * gridSpacing;

      for (let gx = startGridX; gx < camera.x + halfW + gridSpacing; gx += gridSpacing) {
        const sx = halfW + (gx - camera.x);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
      }
      for (let gy = startGridY; gy < camera.y + halfH + gridSpacing; gy += gridSpacing) {
        const sy = halfH + (gy - camera.y);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
      }

      // Fog of war — render revealed cells as lighter patches
      const revealed = new Set(navigation.revealedCells);
      const viewMinCX = Math.floor((camera.x / SCALE - halfW / SCALE) / CELL_SIZE) - 1;
      const viewMaxCX = Math.ceil((camera.x / SCALE + halfW / SCALE) / CELL_SIZE) + 1;
      const viewMinCY = Math.floor((camera.y / SCALE - halfH / SCALE) / CELL_SIZE) - 1;
      const viewMaxCY = Math.ceil((camera.y / SCALE + halfH / SCALE) / CELL_SIZE) + 1;

      for (let cx = viewMinCX; cx <= viewMaxCX; cx++) {
        for (let cy = viewMinCY; cy <= viewMaxCY; cy++) {
          const key = `${cx},${cy}`;
          const screenPos = worldToScreen(cx * CELL_SIZE, cy * CELL_SIZE);
          const cellPx = CELL_SIZE * SCALE;

          if (revealed.has(key)) {
            // Revealed — slightly lighter with parchment feel
            ctx.fillStyle = 'rgba(212, 168, 85, 0.04)';
            ctx.fillRect(screenPos.x, screenPos.y, cellPx, cellPx);
          } else {
            // Unrevealed — dark fog
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(screenPos.x, screenPos.y, cellPx, cellPx);
          }
        }
      }

      // Currents — animated flow lines
      for (const current of navigation.currents) {
        const pos = worldToScreen(current.x, current.y);
        const rad = (current.direction * Math.PI) / 180;
        const len = 30 * current.magnitude;

        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 1.5;

        // Draw 3 parallel flow lines
        for (let i = -1; i <= 1; i++) {
          const offset = i * 8;
          const perpRad = rad + Math.PI / 2;
          const ox = offset * Math.cos(perpRad);
          const oy = offset * Math.sin(perpRad);

          // Animated dash offset
          const dashOffset = (Date.now() / 50 * current.magnitude) % 20;

          ctx.save();
          ctx.setLineDash([6, 8]);
          ctx.lineDashOffset = -dashOffset;
          ctx.beginPath();
          ctx.moveTo(pos.x + ox - len * Math.sin(rad), pos.y + oy + len * Math.cos(rad));
          ctx.lineTo(pos.x + ox + len * Math.sin(rad), pos.y + oy - len * Math.cos(rad));
          ctx.stroke();
          ctx.restore();
        }

        // Arrow head
        const tipX = pos.x + len * Math.sin(rad);
        const tipY = pos.y - len * Math.cos(rad);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 5 * Math.sin(rad - 0.5), tipY + 5 * Math.cos(rad - 0.5));
        ctx.lineTo(tipX - 5 * Math.sin(rad + 0.5), tipY + 5 * Math.cos(rad + 0.5));
        ctx.closePath();
        ctx.fill();
      }

      // Course path
      if (navigation.coursePath.length > 0) {
        ctx.strokeStyle = 'rgba(212, 168, 85, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);

        const subScreen = worldToScreen(sub.position.x, sub.position.y);
        ctx.beginPath();
        ctx.moveTo(subScreen.x, subScreen.y);

        for (const wp of navigation.coursePath) {
          const p = worldToScreen(wp.x, wp.y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Course waypoint dots
        for (const wp of navigation.coursePath) {
          const p = worldToScreen(wp.x, wp.y);
          ctx.fillStyle = 'rgba(212, 168, 85, 0.6)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Waypoints
      for (const wp of navigation.waypoints) {
        const pos = worldToScreen(wp.x, wp.y);
        const color = WAYPOINT_COLORS[wp.type] || '#fff';
        const symbol = WAYPOINT_SYMBOLS[wp.type] || '\u25CF';

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, pos.x, pos.y);
        ctx.shadowBlur = 0;

        // Label
        if (wp.label) {
          ctx.font = '9px monospace';
          ctx.fillStyle = `${color}aa`;
          ctx.textAlign = 'center';
          ctx.fillText(wp.label, pos.x, pos.y + 14);
        }
      }

      // Probe beacons
      for (const beacon of navigation.probeBeacons) {
        const pos = worldToScreen(beacon.x, beacon.y);
        const beaconColor = beacon.state === 'decoded' ? '#2ecc71' : beacon.state === 'pending_decode' ? '#f1c40f' : '#9b59b6';

        ctx.strokeStyle = beaconColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Pulse ring for deployed
        if (beacon.state === 'deployed') {
          const pulse = (Math.sin(Date.now() / 400) + 1) / 2;
          ctx.strokeStyle = `rgba(155, 89, 182, ${0.1 + pulse * 0.2})`;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6 + pulse * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Sub icon
      const subPos = worldToScreen(sub.position.x, sub.position.y);
      const hdgRad = (sub.heading * Math.PI) / 180;

      // Sub body
      ctx.save();
      ctx.translate(subPos.x, subPos.y);
      ctx.rotate(hdgRad);

      // Hull shape
      ctx.fillStyle = 'rgba(212, 168, 85, 0.8)';
      ctx.shadowColor = '#d4a855';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -12);       // bow
      ctx.lineTo(-5, -4);
      ctx.lineTo(-5, 8);
      ctx.lineTo(-3, 10);
      ctx.lineTo(3, 10);
      ctx.lineTo(5, 8);
      ctx.lineTo(5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Conning tower
      ctx.fillStyle = 'rgba(212, 168, 85, 1)';
      ctx.fillRect(-2, -2, 4, 5);

      ctx.restore();

      // Speed indicator (length of trailing wake)
      if (sub.velocity > 0) {
        const wakeLen = sub.velocity * 15;
        ctx.strokeStyle = 'rgba(212, 168, 85, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(subPos.x, subPos.y);
        ctx.lineTo(
          subPos.x - wakeLen * Math.sin(hdgRad),
          subPos.y + wakeLen * Math.cos(hdgRad)
        );
        ctx.stroke();
      }

      // Compass rose (top-right corner)
      const roseX = w - 35;
      const roseY = 35;
      ctx.strokeStyle = 'rgba(212, 168, 85, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(roseX, roseY, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(212, 168, 85, 0.5)';
      ctx.fillText('N', roseX, roseY - 13);
      ctx.fillStyle = 'rgba(212, 168, 85, 0.25)';
      ctx.fillText('S', roseX, roseY + 13);
      ctx.fillText('E', roseX + 13, roseY);
      ctx.fillText('W', roseX - 13, roseY);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasSize, sub, navigation, camera]);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      camX: camera.x,
      camY: camera.y,
    };
  }, [camera]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setCamera({
      x: dragRef.current.camX - (e.clientX - dragRef.current.startX),
      y: dragRef.current.camY - (e.clientY - dragRef.current.startY),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Touch handling for tablets
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      camX: camera.x,
      camY: camera.y,
    };
  }, [camera]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return;
    const touch = e.touches[0];
    setCamera({
      x: dragRef.current.camX - (touch.clientX - dragRef.current.startX),
      y: dragRef.current.camY - (touch.clientY - dragRef.current.startY),
    });
  }, []);

  // Click to plot course (double-click adds waypoint)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const halfW = canvasSize.w / 2;
    const halfH = canvasSize.h / 2;

    // Screen to world
    const worldX = (clickX - halfW + camera.x) / SCALE;
    const worldY = (clickY - halfH + camera.y) / SCALE;

    // Add to course path
    const newPath = [...navigation.coursePath, { x: worldX, y: worldY }];
    onPlotCourse(newPath);
  }, [readOnly, canvasSize, camera, navigation.coursePath, onPlotCourse]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          cursor: dragRef.current ? 'grabbing' : 'grab',
        }}
      />

      {/* Speed/engine info overlay */}
      <div style={{
        position: 'absolute',
        bottom: 6,
        left: 8,
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(212, 168, 85, 0.5)',
        lineHeight: 1.6,
      }}>
        <div>SPD: {sub.velocity.toFixed(1)} kts</div>
        <div>ENG: {['OFF', 'LOW', 'MED', 'HIGH'][enginePower]}</div>
      </div>

      {/* Course info */}
      {navigation.coursePath.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 6,
          right: 8,
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(212, 168, 85, 0.5)',
        }}>
          COURSE: {navigation.coursePath.length} WP
          {!readOnly && (
            <button
              onClick={() => onPlotCourse([])}
              style={{
                marginLeft: 6,
                background: 'transparent',
                border: '1px solid rgba(212, 168, 85, 0.3)',
                borderRadius: 2,
                color: 'rgba(212, 168, 85, 0.5)',
                fontSize: '0.5rem',
                cursor: 'pointer',
                padding: '1px 4px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      )}

      {/* Instructions */}
      {!readOnly && navigation.coursePath.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(212, 168, 85, 0.3)',
          whiteSpace: 'nowrap',
        }}>
          DOUBLE-CLICK TO PLOT COURSE | DRAG TO PAN
        </div>
      )}
    </div>
  );
}
