import { useRef, useEffect, useCallback, useState } from 'react';
import type { Contact } from '@leviathan/shared';

interface Props {
  contacts: Contact[];
  range: number;
  heading: number;
  onPing: (contactId: string) => void;
  onTrack: (contactId: string) => void;
  onUntrack: (contactId: string) => void;
  readOnly?: boolean;
  commendBoost?: boolean;
}

const CONTACT_COLORS: Record<string, string> = {
  friendly: '#2ecc71',
  unknown: '#f1c40f',
  danger: '#e74c3c',
  special: '#9b59b6',
};

const CONTACT_SHAPES: Record<string, string> = {
  friendly: 'circle',
  unknown: 'diamond',
  danger: 'triangle',
  special: 'star',
};

export function SonarSweep({
  contacts,
  range,
  heading,
  onPing,
  onTrack,
  onUntrack,
  readOnly = false,
  commendBoost = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sweepAngleRef = useRef(0);
  const animFrameRef = useRef(0);
  const [size, setSize] = useState(300);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Resize to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const s = Math.min(entry.contentRect.width, entry.contentRect.height);
      setSize(Math.max(200, s));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 10;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = '#0a1628';
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Range rings
      const rings = 4;
      for (let i = 1; i <= rings; i++) {
        const r = (i / rings) * maxR;
        ctx.strokeStyle = `rgba(0, 229, 255, ${i === rings ? 0.2 : 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross hairs
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.sin(angle), cy - maxR * Math.cos(angle));
        ctx.stroke();
      }

      // Bearing labels
      ctx.font = `${size * 0.03}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = ['0', '30', '60', '90', '120', '150', '180', '210', '240', '270', '300', '330'];
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 * Math.PI) / 180;
        const lx = cx + (maxR + 1) * 0.92 * Math.sin(angle);
        const ly = cy - (maxR + 1) * 0.92 * Math.cos(angle);
        ctx.fillStyle = i === 0 ? 'rgba(0, 229, 255, 0.6)' : 'rgba(0, 229, 255, 0.2)';
        ctx.fillText(labels[i], lx, ly);
      }

      // Sweep line
      sweepAngleRef.current = (sweepAngleRef.current + 0.8) % 360;
      const sweepRad = (sweepAngleRef.current * Math.PI) / 180;

      // Sweep fade trail
      const trailLength = 45;
      for (let i = 0; i < trailLength; i++) {
        const trailAngle = ((sweepAngleRef.current - i) * Math.PI) / 180;
        const alpha = ((trailLength - i) / trailLength) * 0.15;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.sin(trailAngle), cy - maxR * Math.cos(trailAngle));
        ctx.stroke();
      }

      // Sweep line itself
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.sin(sweepRad), cy - maxR * Math.cos(sweepRad));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Contacts
      for (const contact of contacts) {
        if (!contact.visible) continue;

        // Only show contacts within range
        if (contact.distance > range) continue;

        const distPct = contact.distance / range;
        const r = distPct * maxR;
        const rad = (contact.bearing * Math.PI) / 180;
        const bx = cx + r * Math.sin(rad);
        const by = cy - r * Math.cos(rad);

        const color = CONTACT_COLORS[contact.type] || '#fff';
        const isSelected = selectedContact === contact.id;
        const blipSize = contact.tracked ? 8 : contact.pinged ? 6 : 5;

        // Glow if recently swept
        const angleDiff = ((sweepAngleRef.current - contact.bearing + 360) % 360);
        const recentlySweept = angleDiff < 30 && angleDiff >= 0;
        const sweepGlow = recentlySweept ? (30 - angleDiff) / 30 : 0;

        // Draw contact
        ctx.save();

        if (contact.pinged) {
          // Pinged: show colored shape
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6 + sweepGlow * 10;
          ctx.globalAlpha = 0.6 + sweepGlow * 0.4;

          if (contact.type === 'danger') {
            // Triangle
            ctx.beginPath();
            ctx.moveTo(bx, by - blipSize);
            ctx.lineTo(bx - blipSize * 0.87, by + blipSize * 0.5);
            ctx.lineTo(bx + blipSize * 0.87, by + blipSize * 0.5);
            ctx.closePath();
            ctx.fill();
          } else if (contact.type === 'unknown') {
            // Diamond
            ctx.beginPath();
            ctx.moveTo(bx, by - blipSize);
            ctx.lineTo(bx + blipSize, by);
            ctx.lineTo(bx, by + blipSize);
            ctx.lineTo(bx - blipSize, by);
            ctx.closePath();
            ctx.fill();
          } else {
            // Circle
            ctx.beginPath();
            ctx.arc(bx, by, blipSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Named indicator
          if (contact.namedBy) {
            ctx.font = `${size * 0.025}px monospace`;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8;
            ctx.textAlign = 'center';
            ctx.fillText('\u2605', bx, by - blipSize - 4); // star symbol
          }
        } else {
          // Unpinged: generic blip, only glows on sweep
          ctx.fillStyle = '#00e5ff';
          ctx.globalAlpha = 0.15 + sweepGlow * 0.5;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = sweepGlow * 8;
          ctx.beginPath();
          ctx.arc(bx, by, blipSize - 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tracked ring
        if (contact.tracked) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.2;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(bx, by, blipSize + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selection highlight
        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8;
          ctx.shadowBlur = 0;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(bx, by, blipSize + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }

      // Center point (sub position)
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Heading indicator
      const hdgRad = (heading * Math.PI) / 180;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 6 * Math.sin(hdgRad), cy - 6 * Math.cos(hdgRad));
      ctx.lineTo(cx + 14 * Math.sin(hdgRad), cy - 14 * Math.cos(hdgRad));
      ctx.stroke();

      // Commend boost indicator
      if (commendBoost) {
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [size, contacts, range, heading, selectedContact, commendBoost]);

  // Handle tap on canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 10;

    // Find nearest contact to click
    let nearest: Contact | null = null;
    let nearestDist = Infinity;

    for (const contact of contacts) {
      if (!contact.visible || contact.distance > range) continue;

      const distPct = contact.distance / range;
      const r = distPct * maxR;
      const rad = (contact.bearing * Math.PI) / 180;
      const bx = cx + r * Math.sin(rad);
      const by = cy - r * Math.cos(rad);

      const dx = x - bx;
      const dy = y - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25 && dist < nearestDist) {
        nearest = contact;
        nearestDist = dist;
      }
    }

    if (nearest) {
      if (!nearest.pinged) {
        onPing(nearest.id);
      } else if (selectedContact === nearest.id) {
        // Toggle track on double-select
        if (nearest.tracked) {
          onUntrack(nearest.id);
        } else {
          onTrack(nearest.id);
        }
        setSelectedContact(null);
      } else {
        setSelectedContact(nearest.id);
      }
    } else {
      setSelectedContact(null);
    }
  }, [contacts, range, size, readOnly, selectedContact, onPing, onTrack, onUntrack]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '1',
        maxWidth: 500,
        maxHeight: 500,
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: size,
          height: size,
          cursor: readOnly ? 'default' : 'crosshair',
          borderRadius: '50%',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.1), inset 0 0 30px rgba(0, 229, 255, 0.05)',
        }}
      />

      {/* Range readout */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.6rem',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(0, 229, 255, 0.5)',
        letterSpacing: '0.1em',
      }}>
        RANGE {range}m
      </div>

      {/* Selected contact info */}
      {selectedContact && (() => {
        const contact = contacts.find((c) => c.id === selectedContact);
        if (!contact) return null;
        return (
          <div style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 22, 40, 0.9)',
            border: `1px solid ${CONTACT_COLORS[contact.type]}44`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
            color: CONTACT_COLORS[contact.type],
            display: 'flex',
            gap: 10,
            whiteSpace: 'nowrap',
          }}>
            <span>{contact.type.toUpperCase()}</span>
            <span>{contact.bearing.toFixed(0)}&deg;</span>
            <span>{contact.distance.toFixed(0)}m</span>
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  contact.tracked ? onUntrack(contact.id) : onTrack(contact.id);
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${CONTACT_COLORS[contact.type]}`,
                  borderRadius: 2,
                  color: CONTACT_COLORS[contact.type],
                  fontSize: '0.5rem',
                  cursor: 'pointer',
                  padding: '1px 4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {contact.tracked ? 'UNTRACK' : 'TRACK'}
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
