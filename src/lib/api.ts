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
  // The backend's contract is intentionally minimal: it only knows about
  // `candidate_name` (used for the LiveKit participant identity) and an
  // opaque `agent_context` blob it forwards verbatim to the agent.
  //
  // Adding a new agent input is a frontend + agent change only -- just
  // include the new field in `agent_context` below and read it in the
  // agent's `_load_session_inputs`. The backend microservice doesn't
  // need to be redeployed.
  const panel = (values.panel ?? [])
    .map((p) => ({ name: p.name.trim(), profile: p.profile.trim() }))
    .filter((p) => p.profile.length > 0);

  const agent_context: Record<string, unknown> = {};
  if (values.job_description) {
    agent_context.job_description = values.job_description;
  }
  if (values.resume) {
    agent_context.resume = values.resume;
  }
  if (panel.length > 0) {
    agent_context.panel = panel;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_name: values.candidate_name || undefined,
      agent_context,
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
