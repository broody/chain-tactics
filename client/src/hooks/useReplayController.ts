import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore, TEAMS } from "../data/gameStore";
import type { TurnSnapshot } from "./useReplayState";

function applySnapshot(snap: TurnSnapshot) {
  const store = useGameStore.getState();
  store.setUnits(snap.units);
  const game = store.game;
  if (game) {
    store.setGame({
      ...game,
      round: snap.round,
      currentPlayer: snap.currentPlayer,
    });
  }
}

export function useReplayController(snapshots: TurnSnapshot[]) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Authoritative ref for current position — updated explicitly on every
  // navigation, NOT synced from React state (avoids stale reads in timers).
  const turnRef = useRef(0);
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  const maxTurn = Math.max(0, snapshots.length - 1);
  const maxTurnRef = useRef(maxTurn);
  maxTurnRef.current = maxTurn;

  const goToTurn = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(n, maxTurn));
      turnRef.current = clamped;
      setCurrentTurn(clamped);
      const snap = snapshots[clamped];
      if (snap) applySnapshot(snap);
    },
    [snapshots, maxTurn],
  );

  const nextTurn = useCallback(() => {
    const max = maxTurnRef.current;
    if (turnRef.current >= max) return;
    const next = turnRef.current + 1;
    turnRef.current = next;
    setCurrentTurn(next);
    const snap = snapshotsRef.current[next];
    if (snap) applySnapshot(snap);
  }, []);

  const prevTurn = useCallback(() => {
    if (turnRef.current <= 0) return;
    const next = turnRef.current - 1;
    turnRef.current = next;
    setCurrentTurn(next);
    const snap = snapshotsRef.current[next];
    if (snap) applySnapshot(snap);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (snapshotsRef.current.length <= 1) return;
    // If at the end, restart from beginning
    if (turnRef.current >= maxTurnRef.current) {
      turnRef.current = 0;
      setCurrentTurn(0);
      const snap = snapshotsRef.current[0];
      if (snap) applySnapshot(snap);
    }
    setIsPlaying(true);
  }, []);

  // Auto-advance via setInterval — restarts when speed or isPlaying changes
  useEffect(() => {
    if (!isPlaying) return;

    const id = setInterval(() => {
      const max = maxTurnRef.current;
      if (turnRef.current >= max) {
        setIsPlaying(false);
        return;
      }

      const next = turnRef.current + 1;
      turnRef.current = next;
      setCurrentTurn(next);
      const snap = snapshotsRef.current[next];
      if (snap) applySnapshot(snap);

      if (next >= max) {
        setIsPlaying(false);
      }
    }, playbackSpeed * 1000);

    return () => clearInterval(id);
  }, [isPlaying, playbackSpeed]);

  const currentSnap = snapshots[currentTurn] ?? null;
  const teamName = currentSnap
    ? (TEAMS[currentSnap.currentPlayer] ?? "unknown")
    : "";

  return {
    currentTurn,
    maxTurn,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    goToTurn,
    nextTurn,
    prevTurn,
    play,
    pause,
    currentSnap,
    teamName,
  };
}
