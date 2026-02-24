import { useState } from "react";
import { PixelPanel } from "./PixelPanel";
import { useGameStore } from "../data/gameStore";
import { useGameHistory } from "../hooks/useGameHistory";

export default function HistoryHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const game = useGameStore((s) => s.game);
  const { events } = useGameHistory(game?.gameId);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div
      className={`absolute bottom-8 left-8 z-20 transition-all duration-300 ${isOpen ? "w-96" : "w-80"}`}
    >
      <PixelPanel title="MISSION_LOG" className="flex flex-col relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-5 right-5 text-[12px] font-bold hover:text-white text-white/40 transition-colors z-10 font-mono"
        >
          {isOpen ? "[-]" : "[+]"}
        </button>

        {!isOpen ? (
          <div
            className="mt-2 cursor-pointer hover:bg-white/5 p-1 transition-colors"
            onClick={() => setIsOpen(true)}
          >
            {latestEvent ? (
              <div className="text-sm flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <span className="text-white/40 shrink-0 font-bold">
                  {new Date(latestEvent.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-white/90 uppercase font-mono truncate font-bold">
                  {latestEvent.message}
                </span>
              </div>
            ) : (
              <div className="text-sm text-white/40 uppercase tracking-widest text-center font-bold">
                READY_FOR_DATA
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mt-2 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
              {events.length === 0 ? (
                <div className="text-sm text-white/40 uppercase tracking-widest py-4 text-center">
                  NO_LOGS_AVAILABLE
                </div>
              ) : (
                events
                  .map((event) => (
                    <div
                      key={event.id}
                      className="text-base flex flex-col gap-1 border-l-4 border-white/10 pl-4 py-2"
                    >
                      <div className="text-white/95 leading-relaxed uppercase font-mono font-bold">
                        {event.message}
                      </div>
                      <div className="opacity-40 text-[10px] font-bold font-mono">
                        T+
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                  .reverse()
              )}
            </div>
          </>
        )}
      </PixelPanel>
    </div>
  );
}
