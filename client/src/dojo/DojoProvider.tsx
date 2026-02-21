import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { init, type SDK } from "@dojoengine/sdk";
import type { Schema } from "./schema";
import { schema } from "./schema";
import { TORII_URL, WORLD_ADDRESS } from "./config";

const DojoContext = createContext<SDK<Schema> | null>(null);

export function DojoProvider({ children }: PropsWithChildren) {
  const [sdk, setSdk] = useState<SDK<Schema> | null>(null);

  useEffect(() => {
    init<Schema>(
      {
        client: {
          worldAddress: WORLD_ADDRESS,
          toriiUrl: TORII_URL,
        },
        domain: {
          name: "hashfront",
          version: "1.0.0",
          chainId: "SN_SEPOLIA",
        },
      },
      schema,
    )
      .then(setSdk)
      .catch((err) => {
        console.error("Failed to initialize Dojo SDK:", err);
      });
  }, []);

  return <DojoContext.Provider value={sdk}>{children}</DojoContext.Provider>;
}

export function useDojo(): SDK<Schema> | null {
  return useContext(DojoContext);
}
