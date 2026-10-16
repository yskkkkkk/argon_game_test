import React, { useState, useRef, useEffect } from 'react';
import { executeTerminalCommand } from '../../game/rules';
import { cyberAudio } from '../../game/audio';
import { Terminal, PowerOff, Check, CornerDownLeft, ExternalLink } from 'lucide-react';

interface SecurityTerminalModuleProps {
  digit: string;
  isPowered: boolean;
  isCleared: boolean;
  onCleared: () => void;
  onOpenEmitter: () => void;
  onPopOutLaserWindow: () => void;
}

export const SecurityTerminalModule: React.FC<SecurityTerminalModuleProps> = ({
  digit,
  isPowered,
  isCleared,
  onCleared,
  onOpenEmitter,
  onPopOutLaserWindow,
}) => {
  const [commandInput, setCommandInput] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([
    'TELETYPE ARCHIVE UNIT // MODEL TP-05',
    'DIRECTIVES: help | status | decrypt',
  ]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const prevPoweredRef = useRef<boolean>(isPowered);

  useEffect(() => {
    if (isPowered && !prevPoweredRef.current) {
      cyberAudio.playScanHum('laser');
      setLogs((prev) => [
        ...prev,
        '[OPTICAL RELAY] 635nm BEAM CONNECTED.',
        'READY. EXECUTE "decrypt" TO PUNCH PAPER TAPE.',
      ]);
    }
    prevPoweredRef.current = isPowered;
  }, [isPowered]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const runCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;
    cyberAudio.playClick(1.15);

    if (trimmed.toLowerCase() === 'clear') {
      setLogs(['TAPE BUFFER CLEARED.']);
      setCommandInput('');
      return;
    }

    const res = executeTerminalCommand(trimmed, isPowered, digit);
    setLogs((prev) => [...prev, `> ${trimmed}`, ...res.outputLines]);
    setCommandInput('');

    if (res.easterEggLog) {
      console.log(
        `%c${res.easterEggLog}`,
        'background: #F4F1EA; color: #141413; font-weight: bold; padding: 6px 10px; border: 2px solid #141413;'
      );
    }

    if (res.unlockedDigit && !isCleared) {
      onCleared();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(commandInput);
  };

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      {/* Optical Power Link Banner */}
      <div
        className={`flex items-center justify-between px-2.5 py-1 border-[1.5px] border-[#141413] font-mono text-[10px] ${
          isPowered || isCleared
            ? 'bg-[#008A4B] text-white'
            : 'bg-[#E6E2D8] text-[#141413]'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold">
          {isPowered || isCleared ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>OPTICAL RECEIVER: ONLINE // TELETYPE READY</span>
            </>
          ) : (
            <>
              <PowerOff className="w-3.5 h-3.5 text-[#FF4F00]" />
              <span>OPTICAL RECEIVER: NO BEAM ON LEFT PORT (OPT-IN)</span>
            </>
          )}
        </div>
        {isCleared && (
          <span className="px-1.5 py-0.5 bg-[#FFFFFF] text-[#141413] border border-[#141413] font-bold">
            PIN #05: {digit}
          </span>
        )}
      </div>

      {/* Teletype Paper Output or Unpowered State */}
      {!isPowered && !isCleared ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-3 border-[1.5px] border-dashed border-[#141413] bg-[#F4F1EA] gap-2">
          <PowerOff className="w-6 h-6 text-[#FF4F00]" />
          <div className="font-mono font-bold text-[11px] text-[#141413]">
            OPTICAL POWER DISCONNECTED
          </div>
          <p className="text-[#4A4945] text-[11px] max-w-xs">
            LASER EMITTER 창을 왼쪽 포트(OPT-IN) 옆에 나란히 배치하여 광학 레이저를 연결하세요.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                cyberAudio.playClick();
                onPopOutLaserWindow();
              }}
              className="px-2.5 py-1.5 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>새 크롬 창으로 레이저 열기</span>
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.playClick();
                onOpenEmitter();
              }}
              className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#141413] hover:text-white text-[#141413] border-[1.5px] border-[#141413] font-mono text-[10px] font-bold cursor-pointer"
            >
              화면 내 레이저 호출
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={logContainerRef}
            className="flex-1 min-h-[85px] p-2.5 bg-[#F4F1EA] border-[1.5px] border-[#141413] font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1 select-text"
          >
            {logs.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.includes('TAPE OUTPUT')
                    ? 'bg-[#FF4F00] text-white font-bold px-2 py-0.5 border border-[#141413]'
                    : line.startsWith('>')
                    ? 'text-[#0047FF] font-bold'
                    : 'text-[#141413]'
                }
              >
                {line}
              </div>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center bg-[#FFFFFF] border-[1.5px] border-[#141413] px-2 py-1">
              <Terminal className="w-3.5 h-3.5 text-[#141413] mr-1.5 shrink-0" />
              <input
                type="text"
                aria-label="Terminal Command Input"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Type decrypt..."
                className="w-full bg-transparent text-[#141413] placeholder-[#78756E] font-mono text-xs focus:outline-none"
              />
            </div>
            <button
              type="submit"
              aria-label="Run Command"
              className="px-2.5 py-1 bg-[#141413] hover:bg-[#FF4F00] text-white border-[1.5px] border-[#141413] font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>EXEC</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </form>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-[#78756E]">TAPE MACRO:</span>
            <button
              type="button"
              onClick={() => runCommand('help')}
              className="px-2 py-0.5 bg-[#E6E2D8] hover:bg-[#141413] hover:text-white border border-[#141413] text-[#141413] font-mono text-[10px] font-bold cursor-pointer"
            >
              help
            </button>
            <button
              type="button"
              onClick={() => runCommand('status')}
              className="px-2 py-0.5 bg-[#E6E2D8] hover:bg-[#141413] hover:text-white border border-[#141413] text-[#141413] font-mono text-[10px] font-bold cursor-pointer"
            >
              status
            </button>
            <button
              type="button"
              onClick={() => runCommand('decrypt')}
              className="px-2 py-0.5 bg-[#FF4F00] hover:bg-[#e04500] text-white border border-[#141413] font-mono text-[10px] font-bold cursor-pointer"
            >
              decrypt
            </button>
          </div>
        </>
      )}
    </div>
  );
};
