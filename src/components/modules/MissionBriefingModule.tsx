import React from 'react';
import { Check, Focus } from 'lucide-react';
import { cyberAudio } from '../../game/audio';

interface MissionBriefingModuleProps {
  clearedStatus: boolean[];
  passcodeDigits: string[];
  onFocusModule: (windowId: string) => void;
}

const MODULE_SPECS = [
  {
    num: '01',
    id: 'module1',
    title: '01 // KINETIC DUST FILTER',
    spec: 'ACTION: SHAKE BROWSER WINDOW OR PANEL (≥85%)',
  },
  {
    num: '02',
    id: 'module2',
    title: '02 // SEALED BLUEPRINT',
    spec: 'ACTION: POP-OUT OR DRAG X-RAY LENS OVER BLUEPRINT',
  },
  {
    num: '03',
    id: 'module3',
    title: '03 // THERMAL LOCK',
    spec: 'ACTION: AIR-BLOW MIC OR PUMP BELLOWS TO 0.0°C',
  },
  {
    num: '04',
    id: 'module4',
    title: '04 // MECHANICAL CALIPER',
    spec: 'ACTION: RESIZE MODULE TO 550×250px (±15px)',
  },
  {
    num: '05',
    id: 'module5_terminal',
    title: '05 // OPTICAL RECEIVER',
    spec: 'ACTION: ALIGN LASER LEFT OF PORT & EXEC "decrypt"',
  },
];

export const MissionBriefingModule: React.FC<MissionBriefingModuleProps> = ({
  clearedStatus,
  passcodeDigits,
  onFocusModule,
}) => {
  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs overflow-y-auto select-none bg-[#FFFFFF]">
      <div className="p-2 bg-[#E6E2D8] border-[1.5px] border-[#141413] font-mono text-[10px]">
        <div className="font-bold text-[#141413]">
          TECHNICAL MANUAL // THE VAULT ESCAPEMENT SYSTEM
        </div>
        <div className="text-[#4A4945] mt-0.5">
          SYNC ENGINE: BroadcastChannel(&apos;vault_multi_window_sync&apos;) + window.screenX/Y
        </div>
      </div>

      <div className="space-y-1.5">
        {MODULE_SPECS.map((item, idx) => {
          const isCleared = clearedStatus[idx];
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 p-2 border-[1.5px] border-[#141413] ${
                isCleared ? 'bg-[#008A4B]/10' : 'bg-[#F4F1EA]'
              }`}
            >
              <div className="min-w-0 flex-1 font-mono">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#141413]">
                  <span>{item.title}</span>
                  {isCleared && (
                    <span className="text-[#008A4B] flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> [{passcodeDigits[idx]}]
                    </span>
                  )}
                </div>
                <div className="text-[#4A4945] text-[10px] truncate mt-0.5">{item.spec}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  cyberAudio.playClick();
                  onFocusModule(item.id);
                }}
                className="px-2 py-1 bg-[#FFFFFF] hover:bg-[#141413] hover:text-white border border-[#141413] text-[#141413] font-mono text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Focus className="w-3 h-3" />
                <span>FOCUS</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-2 flex items-center justify-between text-[11px] font-mono border-t-[1.5px] border-[#141413]">
        <span className="font-bold text-[#141413]">DECODED TUMBLER PINS:</span>
        <div className="flex items-center gap-1">
          {passcodeDigits.map((d, idx) => (
            <span
              key={idx}
              className={`w-6 h-6 flex items-center justify-center font-bold border-[1.5px] border-[#141413] ${
                clearedStatus[idx]
                  ? 'bg-[#008A4B] text-white'
                  : 'bg-[#E6E2D8] text-[#78756E]'
              }`}
            >
              {clearedStatus[idx] ? d : '-'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
