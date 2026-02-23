import { TORII_URL } from "../dojo/config";

export async function fetchToriiSql<T>(query: string): Promise<T[]> {
  const response = await fetch(`${TORII_URL}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL query failed: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return result as T[];
}
