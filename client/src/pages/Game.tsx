import { useParams } from "react-router-dom";
import GameViewport from "../components/GameViewport";
import HUD from "../components/HUD";
import { useGameState } from "../hooks/useGameState";

export default function Game() {
  const { id } = useParams<{ id: string }>();
  const { loading, error } = useGameState(id);

  if (loading) {
    return (
      <div className="crt-screen w-screen h-screen flex items-center justify-center bg-blueprint-dark text-blueprint-light">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="crt-screen w-screen h-screen flex items-center justify-center bg-blueprint-dark text-blueprint-light">
        {error}
      </div>
    );
  }

  return (
    <div className="crt-screen w-screen h-screen overflow-hidden relative bg-blueprint-dark">
      <div className="crt-vignette"></div>
      <div className="haze-bloom w-full h-full relative">
        <GameViewport key={id} />
        <HUD />
      </div>
    </div>
  );
}
