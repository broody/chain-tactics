import { useParams } from "react-router-dom";
import GameViewport from "../components/GameViewport";
import HUD from "../components/HUD";

export default function Game() {
  const { id } = useParams<{ id: string }>();

  // TODO: Use id to load the specific game
  console.log("Loading game:", id);

  return (
    <div className="crt-screen w-screen h-screen overflow-hidden relative bg-blueprint-dark">
      <div className="crt-vignette"></div>
      <div className="haze-bloom w-full h-full relative">
        <GameViewport />
        <HUD />
      </div>
    </div>
  );
}
