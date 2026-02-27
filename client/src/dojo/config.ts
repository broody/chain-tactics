const DEFAULT_TORII_URL = "https://api.cartridge.gg/x/hashfront/torii";
const envToriiUrl = import.meta.env.VITE_TORII_URL?.trim();

if (!envToriiUrl) {
  console.warn(
    "VITE_TORII_URL is not set. Falling back to default Hashfront Torii endpoint.",
  );
}

export const TORII_URL = envToriiUrl || DEFAULT_TORII_URL;

export const WORLD_ADDRESS =
  "0x4e77dcdb72dba9954dce4ec5eb60e701afacf02394069172b3ea50bdea6bddd";

export const ACTIONS_ADDRESS =
  "0x108fb3acfc928a8149f4d2ce7fbeb8a0e6f8379313ed3b43406cceface03253";
