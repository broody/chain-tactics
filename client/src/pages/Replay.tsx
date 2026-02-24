import { useParams } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import GameViewport from "../components/GameViewport";
import ReplayHUD from "../components/ReplayHUD";
import { useReplayState } from "../hooks/useReplayState";
import { useReplayController } from "../hooks/useReplayController";
import { useGameStore } from "../data/gameStore";

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number.parseInt(id || "", 10);
  const { loading: dataLoading, error, snapshots } = useReplayState(id);
  const controller = useReplayController(snapshots);
  const [viewportLoaded, setViewportLoaded] = useState(false);
  const handleLoaded = useCallback(() => setViewportLoaded(true), []);
  const isFullyLoaded = !dataLoading && viewportLoaded;

  // Set isReplay on mount, clear on unmount
  useEffect(() => {
    useGameStore.getState().setIsReplay(true);
    return () => {
      useGameStore.getState().setIsReplay(false);
    };
  }, []);

  const loadingMessage = useMemo(() => {
    const messages = [
      "DECRYPTING_BATTLE_RECORDS",
      "RECONSTRUCTING_TIMELINE",
      "LOADING_ARCHIVED_SECTOR",
      "PARSING_EVENT_STREAM",
      "ASSEMBLING_REPLAY_DATA",
      "RESTORING_TACTICAL_STATE",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  if (error) {
    return (
      <div className="crt-screen w-screen h-screen flex flex-col items-center justify-center bg-blueprint-dark text-red-500 font-mono gap-4">
        <div className="text-2xl tracking-[0.5em] flicker-text">
          SYSTEM_ERROR
        </div>
        <div className="text-sm border border-red-500/50 p-4 bg-red-500/10">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="crt-screen w-screen h-screen overflow-hidden relative bg-blueprint-dark">
      {/* Loading Overlay */}
      <div
        className={`absolute inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-none ${
          isFullyLoaded ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backgroundColor: "var(--bp-dark)",
          backgroundImage: `
            linear-gradient(var(--bp-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px",
        }}
      >
        <div className="mb-8 flicker-text">
          <svg width="80" height="80" viewBox="0 0 40 40">
            <g
              transform="skewX(-15) skewY(5) scale(0.9)"
              style={{ transformOrigin: "center" }}
            >
              <g stroke="white" fill="none" strokeWidth="2">
                <path d="M15 6 V34 M25 6 V34 M6 15 H34 M6 25 H34" />
              </g>
              <g
                stroke="white"
                fill="none"
                strokeWidth="0.5"
                opacity="0.3"
                transform="translate(4,4)"
              >
                <path d="M15 6 V34 M25 6 V34 M6 15 H34 M6 25 H34" />
              </g>
            </g>
            <path
              d="M2 2 H8 M2 2 V8 M32 2 H38 M38 2 V8 M2 38 H8 M2 38 V32 M32 38 H38 M38 38 V32"
              stroke="white"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        <div className="text-2xl tracking-[0.5em] text-white font-mono flicker-text animate-pulse text-center px-4">
          {loadingMessage}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="w-64 h-1 border border-white/20 relative overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-white/40 ${isFullyLoaded ? "" : "transition-all duration-700 ease-out"}`}
              style={{
                width: viewportLoaded ? "100%" : dataLoading ? "30%" : "70%",
              }}
            />
            <div className="absolute inset-0 bg-white/10 animate-[scanline_2s_linear_infinite]" />
          </div>
          <div className="text-[10px] text-white/40 font-mono uppercase tracking-[0.3em]">
            {dataLoading
              ? "Fetching_Historical_Events"
              : "Booting_Replay_Display"}{" "}
            // Sector_{id}
          </div>
        </div>
      </div>

      <div className="crt-vignette"></div>
      <div className="haze-bloom w-full h-full relative">
        {!dataLoading && (
          <GameViewport key={`replay-${id}`} onLoaded={handleLoaded} />
        )}
        <ReplayHUD controller={controller} gameId={gameId} />
      </div>
    </div>
  );
}
