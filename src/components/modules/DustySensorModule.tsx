import React, { useEffect, useRef, useState } from 'react';
import { DustParticle, stepDustPhysics } from '../../game/rules';
import { cyberAudio } from '../../game/audio';
import { RotateCcw, Activity } from 'lucide-react';

interface DustySensorModuleProps {
  digit: string;
  shakeImpulseRef: React.MutableRefObject<{ dx: number; dy: number }>;
  isCleared: boolean;
  onCleared: () => void;
}

const TOTAL_PARTICLES = 210;

export const DustySensorModule: React.FC<DustySensorModuleProps> = ({
  digit,
  shakeImpulseRef,
  isCleared,
  onCleared,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<DustParticle[]>([]);
  const [clearedPercent, setClearedPercent] = useState<number>(0);
  const clearedFiredRef = useRef<boolean>(isCleared);
  const onClearedRef = useRef(onCleared);

  useEffect(() => {
    onClearedRef.current = onCleared;
  }, [onCleared]);

  useEffect(() => {
    clearedFiredRef.current = isCleared;
  }, [isCleared]);

  const initParticles = (width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2 - 8;
    const list: DustParticle[] = [];
    // Iron filings, graphite & brass sand palette
    const palette = ['#141413', '#2B2B29', '#4A4945', '#FF4F00', '#78756E'];

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 52;
      const rawY = cy + Math.sin(angle) * radius * 0.65 + (Math.random() - 0.5) * 14;
      list.push({
        x: cx + Math.cos(angle) * radius * 1.15 + (Math.random() - 0.5) * 24,
        y: Math.min(height * 0.52, Math.max(14, rawY)),
        vx: 0,
        vy: 0,
        size: 3.5 + Math.random() * 4.5,
        color: palette[i % palette.length],
        cleared: false,
      });
    }
    particlesRef.current = list;
    setClearedPercent(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initParticles(canvas.width, canvas.height);

    let animId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const { dx, dy } = shakeImpulseRef.current;
      shakeImpulseRef.current.dx *= 0.55;
      shakeImpulseRef.current.dy *= 0.55;

      if (Math.hypot(dx, dy) > 5) {
        cyberAudio.playShakeTick();
      }

      const result = stepDustPhysics(
        particlesRef.current,
        dx,
        dy,
        canvas.width,
        canvas.height,
        dt
      );

      const pct = Math.min(100, Math.round((result.clearedRatio / 0.85) * 100));
      setClearedPercent((prev) => (prev !== pct ? pct : prev));

      if (result.isCleared && !clearedFiredRef.current) {
        clearedFiredRef.current = true;
        onClearedRef.current();
      }

      // Draw Warm Drafting Paper Surface
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Technical crosshairs & millimeter grid
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Center Dial Ring
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 8, 52, 0, Math.PI * 2);
      ctx.stroke();

      // Stamped Vault Number
      ctx.save();
      ctx.font = '700 78px "Space Grotesk", "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = result.isCleared || clearedFiredRef.current ? '#008A4B' : '#141413';
      ctx.fillText(digit, canvas.width / 2, canvas.height / 2 - 6);
      ctx.restore();

      // Sediment Tray Floor Line
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, canvas.height - 20);
      ctx.lineTo(canvas.width - 10, canvas.height - 20);
      ctx.stroke();

      ctx.fillStyle = '#78756E';
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillText('SEDIMENT COLLECTOR TRAY', 12, canvas.height - 7);

      // Draw Iron Filings / Sand Particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        ctx.fillStyle = p.cleared ? '#A8A49B' : p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [digit, shakeImpulseRef]);

  const handleKineticPulse = () => {
    cyberAudio.playShakeTick();
    shakeImpulseRef.current.dx = (Math.random() > 0.5 ? 1 : -1) * 58;
    shakeImpulseRef.current.dy = 45;
  };

  const handleResetDust = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cyberAudio.playClick();
    initParticles(canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      {/* Concise Swiss Specification Spec Bar */}
      <div className="flex items-center justify-between border-b border-[#141413] pb-1.5 font-mono text-[10px]">
        <span className="font-bold text-[#141413]">ACTION: SHAKE BROWSER OR PANEL</span>
        <span className="text-[#FF4F00] font-bold">SENSOR: ΔscreenX / ΔscreenY</span>
      </div>

      <div className="relative flex-1 min-h-[135px] border-[1.5px] border-[#141413] overflow-hidden bg-[#F4F1EA]">
        <canvas
          ref={canvasRef}
          width={330}
          height={155}
          className="w-full h-full block"
        />
        {isCleared && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#008A4B] text-white border border-[#141413] font-mono text-[10px] font-bold">
            PIN #01: {digit}
          </div>
        )}
      </div>

      {/* Tactile Meter & Manual Jolt Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
            <span>CLEARANCE (TARGET 85%)</span>
            <span className="tabular-nums text-[#FF4F00]">{clearedPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#E6E2D8] border border-[#141413]">
            <div
              className="h-full bg-[#141413] transition-all duration-100"
              style={{ width: `${clearedPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleKineticPulse}
            className="px-2.5 py-1.5 bg-[#F4F1EA] hover:bg-[#FF4F00] hover:text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>충격 가하기</span>
          </button>
          <button
            type="button"
            onClick={handleResetDust}
            aria-label="먼지 초기화"
            className="p-1.5 bg-[#E6E2D8] hover:bg-[#141413] hover:text-white border-[1.5px] border-[#141413] transition-colors cursor-pointer"
            title="입자 재도포"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
