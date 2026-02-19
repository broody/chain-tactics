import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { useEffect, useState } from "react";
import { PixelButton } from "./PixelButton";
import { PixelPanel } from "./PixelPanel";

const LEGEND: { label: string; color: string }[] = [
  { label: "Grass", color: "#4a7c59" },
  { label: "Mountain", color: "#8b7355" },
  { label: "City", color: "#708090" },
  { label: "Factory", color: "#696969" },
  { label: "HQ", color: "#daa520" },
  { label: "Road", color: "#9e9e9e" },
];

const HUD = () => {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const controller = connectors[0] as ControllerConnector;
  const [username, setUsername] = useState<string>();

  useEffect(() => {
    if (!address) return;
    controller.username()?.then(setUsername);
  }, [address, controller]);

  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-16 bg-blueprint-blue/60 flex items-center justify-between px-8 z-10 border-b-2 border-white backdrop-blur-sm">
        <span className="text-base font-bold tracking-[2px] uppercase">
          &gt; TACTICAL_DISPLAY
        </span>

        {address ? (
          <div className="flex items-center gap-6">
            <PixelButton
              variant="gray"
              onClick={() => controller.openProfile()}
              className="!py-1 !px-4"
            >
              COMMANDER:{" "}
              {username ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
            </PixelButton>
          </div>
        ) : (
          <PixelButton
            variant="blue"
            onClick={() => connect({ connector: controller })}
            className="!py-1 !px-4"
          >
            CONNECT_SYSTEM
          </PixelButton>
        )}
      </div>

      <div className="absolute top-24 right-8 z-10">
        <PixelPanel title="TERRAIN_INTEL" className="!p-4 min-w-[200px]">
          <div className="flex flex-col gap-3 mt-2">
            {LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span
                  className="w-4 h-4 border border-white"
                  style={{ background: item.color }}
                />
                <span className="text-xs uppercase tracking-widest">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>
    </>
  );
};

export default HUD;
