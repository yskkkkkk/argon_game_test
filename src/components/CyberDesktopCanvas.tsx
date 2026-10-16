import React, { useEffect, useRef } from 'react';

interface CyberDesktopCanvasProps {
  laserConnection: {
    active: boolean;
    emitterPos: { x: number; y: number } | null;
    terminalPos: { x: number; y: number } | null;
  };
  isSystemUnlocked: boolean;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  vAngle: number;
}

export const CyberDesktopCanvas: React.FC<CyberDesktopCanvasProps> = ({
  laserConnection,
  isSystemUnlocked,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const laserRef = useRef(laserConnection);
  const unlockedRef = useRef(isSystemUnlocked);
  const confettiRef = useRef<ConfettiParticle[]>([]);

  useEffect(() => {
    laserRef.current = laserConnection;
  }, [laserConnection]);

  useEffect(() => {
    const wasUnlocked = unlockedRef.current;
    unlockedRef.current = isSystemUnlocked;

    if (isSystemUnlocked && !wasUnlocked) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Braun / Teenage Engineering Swiss palette paper confetti
      const colors = ['#FF4F00', '#008A4B', '#0047FF', '#141413', '#E6E2D8'];
      const burst: ConfettiParticle[] = [];
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 130 + Math.random() * 420;
        burst.push({
          x: w / 2 + (Math.random() - 0.5) * 240,
          y: h / 2 + (Math.random() - 0.5) * 120,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 200,
          size: 6 + Math.random() * 6,
          color: colors[i % colors.length],
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 8,
        });
      }
      confettiRef.current = burst;
    }
  }, [isSystemUnlocked]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let animId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      if (isHeadless && rawDt < 0.06) {
        animId = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Draw Cross-Window Optical Laser Beam Bridge (Gimmick 5)
      const laser = laserRef.current;
      if (laser.emitterPos) {
        const ex = laser.emitterPos.x;
        const ey = laser.emitterPos.y;

        if (laser.active && laser.terminalPos) {
          const tx = laser.terminalPos.x;
          const ty = laser.terminalPos.y;

          ctx.save();
          // Crisp International Orange / Forest Green Optical Beam without neon blur
          ctx.strokeStyle = '#141413';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.strokeStyle = '#FF4F00';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Geometric Target Reticle at Receiver Port
          ctx.fillStyle = '#008A4B';
          ctx.strokeStyle = '#141413';
          ctx.lineWidth = 1.5;
          ctx.fillRect(tx - 6, ty - 6, 12, 12);
          ctx.strokeRect(tx - 6, ty - 6, 12, 12);
          ctx.restore();
        } else {
          // Unconnected dashed optical reference beam
          ctx.save();
          ctx.strokeStyle = '#FF4F00';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + 140, ey);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Paper Confetti on Vault Unlock
      if (confettiRef.current.length > 0) {
        for (let i = 0; i < confettiRef.current.length; i++) {
          const c = confettiRef.current[i];
          c.vy += 340 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.angle += c.vAngle * dt;

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.angle);
          ctx.fillStyle = c.color;
          ctx.strokeStyle = '#141413';
          ctx.lineWidth = 1;
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.65);
          ctx.strokeRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.65);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
    />
  );
};
