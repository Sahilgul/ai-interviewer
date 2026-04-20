import { createRoot } from "react-dom/client";
import "@livekit/components-styles";
import App from "./App";
import "./index.css";

// NOTE: intentionally NOT wrapping in <StrictMode>. React 18 StrictMode
// double-invokes effects in development, which causes our LiveKit Room to
// connect → disconnect → reconnect within milliseconds. The first connect's
// PeerConnection gets torn down by the cleanup, and the in-flight connect()
// call surfaces as "PC manager is closed". Disabling StrictMode is the
// standard pattern for WebRTC apps.

// Mount the aurora + grain layers once at the document level so every
// screen sits on top of the same cinematic backdrop.
const aurora = document.createElement("div");
aurora.className = "aurora";
aurora.appendChild(document.createElement("span"));
document.body.prepend(aurora);

const grain = document.createElement("div");
grain.className = "grain";
document.body.prepend(grain);

createRoot(document.getElementById("root")!).render(<App />);
