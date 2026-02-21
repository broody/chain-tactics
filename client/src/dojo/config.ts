const DEFAULT_TORII_URL = "https://api.cartridge.gg/x/hashfront/torii";
const envToriiUrl = import.meta.env.VITE_TORII_URL?.trim();

if (!envToriiUrl) {
  console.warn(
    "VITE_TORII_URL is not set. Falling back to default Hashfront Torii endpoint.",
  );
}

export const TORII_URL = envToriiUrl || DEFAULT_TORII_URL;

export const WORLD_ADDRESS =
  "0x07f87b22d97fcd790a1d784252128540a3f73be8d505558d4de27054da8a4db6";
