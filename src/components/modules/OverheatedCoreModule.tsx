import React, { useEffect, useRef, useState } from 'react';
import { stepCoreCooling } from '../../game/rules';
import { cyberAudio } from '../../game/audio';
import { Mic, Wind, Check, Flame } from 'lucide-react';

interface OverheatedCoreModuleProps {
  digit: string;
  isCleared: boolean;
  onCleared: () => void;
}

export const OverheatedCoreModule: React.FC<OverheatedCoreModuleProps> = ({
  digit,
  isCleared,
  onCleared,
}) => {
  const [temperature, setTemperature] = useState<number>(100.0);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'denied'>('idle');
  const [fanRpm, setFanRpm] = useState<number>(240);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempRef = useRef<number>(100.0);
  const pumpImpulseRef = useRef<boolean>(false);
  const fanAngleRef = useRef<number>(0);
  const clearedRef = useRef<boolean>(isCleared);
  const onClearedRef = useRef(onCleared);

  useEffect(() => {
    onClearedRef.current = onCleared;
  }, [onCleared]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    clearedRef.current = isCleared;
    if (isCleared) {
      tempRef.current = 0;
      setTemperature(0);
    }
  }, [isCleared]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleConnectMic = async () => {
    cyberAudio.playClick();
    if (micStatus === 'listening') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicStatus('listening');
    } catch {
      setMicStatus('denied');
    }
  };

  const handleManualPump = () => {
    pumpImpulseRef.current = true;
    cyberAudio.playCoolingPulse(tempRef.current / 100);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64);
    let animId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      let micNormalized = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / freqData.length;
        micNormalized = Math.min(1, avg / 95);
      }

      const pumpTriggered = pumpImpulseRef.current;
      pumpImpulseRef.current = false;

      const step = stepCoreCooling(tempRef.current, micNormalized, pumpTriggered, dt);
      tempRef.current = step.nextTemp;
      setTemperature((prev) => (prev !== step.nextTemp ? step.nextTemp : prev));
      setFanRpm((prev) => (Math.abs(prev - step.fanSpeedRpm) > 50 ? step.fanSpeedRpm : prev));

      if (step.isCleared && !clearedRef.current) {
        clearedRef.current = true;
        onClearedRef.current();
      }

      const w = canvas.width;
      const h = canvas.height;
      const heatRatio = tempRef.current / 100;

      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, w, h);

      // Left: Mechanical Turbine Impeller
      fanAngleRef.current += (step.fanSpeedRpm / 500) * dt * 8;
      const fanX = 58;
      const fanY = h / 2 - 4;

      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fanX, fanY, 34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(fanX, fanY);
      ctx.rotate(fanAngleRef.current);
      ctx.fillStyle = step.isCleared ? '#008A4B' : '#141413';
      for (let b = 0; b < 6; b++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(25, -7);
        ctx.lineTo(28, 7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Middle: Analog Needle Thermometer Dial
      const gaugeX = 165;
      const gaugeY = h / 2 + 18;
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 42, Math.PI, 0, false);
      ctx.stroke();

      // Tick marks along semi-circle
      for (let t = 0; t <= 10; t++) {
        const ang = Math.PI + (t / 10) * Math.PI;
        const r1 = 35;
        const r2 = 42;
        ctx.strokeStyle = t >= 7 ? '#FF4F00' : '#141413';
        ctx.beginPath();
        ctx.moveTo(gaugeX + Math.cos(ang) * r1, gaugeY + Math.sin(ang) * r1);
        ctx.lineTo(gaugeX + Math.cos(ang) * r2, gaugeY + Math.sin(ang) * r2);
        ctx.stroke();
      }

      // Analog Needle
      const needleAngle = Math.PI + heatRatio * Math.PI;
      ctx.strokeStyle = step.isCleared ? '#008A4B' : '#FF4F00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(
        gaugeX + Math.cos(needleAngle) * 34,
        gaugeY + Math.sin(needleAngle) * 34
      );
      ctx.stroke();

      ctx.fillStyle = '#141413';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Right: Vault Tumbler Window for 3rd Digit
      const boxX = 238;
      const boxY = 20;
      const boxW = 82;
      const boxH = h - 40;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (step.isCleared) {
        ctx.fillStyle = '#008A4B';
        ctx.font = '700 56px "Space Grotesk", "JetBrains Mono", monospace';
        ctx.fillText(digit, boxX + boxW / 2, boxY + boxH / 2 + 2);
      } else {
        // Masked by mechanical thermal shutter stripes
        ctx.fillStyle = '#E6E2D8';
        ctx.font = '700 52px "Space Grotesk", "JetBrains Mono", monospace';
        ctx.fillText(digit, boxX + boxW / 2, boxY + boxH / 2 + 2);

        const shutterHeight = boxH * heatRatio;
        ctx.fillStyle = '#FF4F00';
        ctx.fillRect(boxX + 2, boxY + 2, boxW - 4, shutterHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        if (shutterHeight > 22) {
          ctx.fillText('LOCKED', boxX + boxW / 2, boxY + shutterHeight / 2 + 2);
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [digit]);

  const isOverheated = temperature > 0;

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#141413] pb-1.5 font-mono text-[10px]">
        <span className="font-bold text-[#141413]">ACTION: AIR-BLOW OR PUMP TO 0.0°C</span>
        <span className="text-[#FF4F00] font-bold tabular-nums">
          TURBINE: {fanRpm} RPM
        </span>
      </div>

      {/* Analog Temperature Readout Bar */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#E6E2D8] border-[1.5px] border-[#141413] font-mono">
        <div className="flex items-center gap-1.5">
          {isOverheated ? (
            <Flame className="w-3.5 h-3.5 text-[#FF4F00]" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#008A4B]" />
          )}
          <span className="text-[11px] font-bold text-[#141413]">
            {isOverheated ? 'THERMAL SHUTTER ENGAGED' : 'LATCH RELEASED'}
          </span>
        </div>
        <span
          data-testid="core-temperature"
          className={`text-sm font-bold tabular-nums ${
            isOverheated ? 'text-[#FF4F00]' : 'text-[#008A4B]'
          }`}
        >
          {temperature.toFixed(1)}°C
        </span>
      </div>

      <div className="relative flex-1 min-h-[115px] border-[1.5px] border-[#141413] overflow-hidden bg-[#F4F1EA]">
        <canvas
          ref={canvasRef}
          width={340}
          height={125}
          className="w-full h-full block"
        />
        {isCleared && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#008A4B] text-white border border-[#141413] font-mono text-[10px] font-bold">
            PIN #03: {digit}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleConnectMic}
          className="flex-1 px-2.5 py-1.5 bg-[#F4F1EA] hover:bg-[#141413] hover:text-white text-[#141413] border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Mic className="w-3.5 h-3.5 text-[#FF4F00] shrink-0" />
          <span>
            {micStatus === 'listening'
              ? '음파 감지 중 (바람 불기)'
              : micStatus === 'denied'
              ? '마이크 차단됨'
              : '마이크 활성화'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleManualPump}
          className="flex-1 px-2.5 py-1.5 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          <span>수동 풀무 펌프</span>
        </button>
      </div>
    </div>
  );
};
