import type { ConnectionDetails, SetupValues } from "./types";

// Read backend config from Vite env (frontend/.env). In dev the proxy in
// vite.config.ts forwards /api/* to VITE_BACKEND_URL, so we deliberately
// fall back to a relative path then. In prod builds we hit the absolute
// backend URL directly.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
const CONNECTION_DETAILS_PATH =
  import.meta.env.VITE_CONNECTION_DETAILS_PATH || "/api/connection-details";

const TOKEN_ENDPOINT = import.meta.env.DEV
  ? CONNECTION_DETAILS_PATH
  : `${BACKEND_URL}${CONNECTION_DETAILS_PATH}`;

export async function fetchConnectionDetails(
  values: SetupValues,
): Promise<ConnectionDetails> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_name: values.candidate_name || undefined,
      job_description: values.job_description || undefined,
      resume: values.resume || undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Token server returned ${res.status}: ${text || res.statusText}`,
    );
  }
  return (await res.json()) as ConnectionDetails;
}
