import { useEffect, useMemo, useRef, useState } from "react";
import {
  RoomContext,
  RoomAudioRenderer,
  StartAudio,
  BarVisualizer,
  useVoiceAssistant,
  useTranscriptions,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { Room, type RpcInvocationData } from "livekit-client";
import {
  AlertTriangle,
  Bot,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Sparkles,
  User,
} from "lucide-react";
import type { ConnectionDetails, InterviewEvaluation } from "../lib/types";

type Props = {
  connection: ConnectionDetails;
  onEvaluation: (e: InterviewEvaluation) => void;
  onLeave: () => void;
};

const EVAL_RPC_METHOD = "interview.evaluation";

export function LiveInterviewScreen({
  connection,
  onEvaluation,
  onLeave,
}: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const onEvaluationRef = useRef(onEvaluation);
  useEffect(() => {
    onEvaluationRef.current = onEvaluation;
  }, [onEvaluation]);

  useEffect(() => {
    let cancelled = false;
    const r = new Room({ adaptiveStream: true, dynacast: true });

    const connectRoom = async () => {
      try {
        // Register the RPC handler BEFORE connect so we can't miss the
        // agent's interview.evaluation call.
        r.localParticipant.registerRpcMethod(
          EVAL_RPC_METHOD,
          async (data: RpcInvocationData) => {
            try {
              const parsed = JSON.parse(data.payload) as InterviewEvaluation;
              onEvaluationRef.current(parsed);
            } catch (e) {
              console.error("failed to parse evaluation payload", e);
            }
            return "ok";
          },
        );

        await r.connect(connection.server_url, connection.participant_token);
        if (cancelled) {
          await r.disconnect();
          return;
        }
        await r.localParticipant.setMicrophoneEnabled(true);
        setRoom(r);
      } catch (e) {
        if (cancelled) return;
        console.error("failed to connect", e);
        setConnectError(
          e instanceof Error ? e.message : "Failed to connect to LiveKit",
        );
      }
    };

    void connectRoom();

    return () => {
      cancelled = true;
      r.disconnect().catch(() => undefined);
    };
  }, [connection]);

  if (connectError) {
    return (
      <div className="fade-in grid min-h-screen place-items-center px-6">
        <div className="surface edge w-full max-w-md rounded-2xl p-7 text-center">
          <p className="font-serif text-2xl italic text-rose-100">
            We couldn't connect.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream-2/70">
            {connectError}
          </p>
          <button
            onClick={onLeave}
            className="btn-primary mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Back to setup
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="fade-in grid min-h-screen place-items-center px-6">
        <div className="flex flex-col items-center gap-4 text-cream-2/70">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-hairline bg-ink-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-glow" />
          </div>
          <p className="font-serif text-xl italic text-cream">
            Warming up the room…
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Click to enable interview audio" />
      <InterviewStage
        onLeave={onLeave}
        candidate={connection.participant_name}
      />
    </RoomContext.Provider>
  );
}

type Segment = {
  id: string;
  role: "agent" | "you";
  text: string;
  timestamp: number;
};

type Turn = {
  id: string;
  role: "agent" | "you";
  text: string;
  timestamp: number;
};

type WrapPhase =
  | { kind: "idle" }
  | { kind: "wrapping"; startedAt: number }
  | { kind: "stuck" }
  | { kind: "error"; message: string };

const EVAL_TIMEOUT_MS = 60_000;

function InterviewStage({
  onLeave,
  candidate,
}: {
  onLeave: () => void;
  candidate: string;
}) {
  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const transcriptions = useTranscriptions();

  const [wrap, setWrap] = useState<WrapPhase>({ kind: "idle" });
  const isEnding = wrap.kind !== "idle";
  const timeoutRef = useRef<number | null>(null);

  // If the evaluation never arrives in EVAL_TIMEOUT_MS, fall back to "stuck".
  useEffect(() => {
    if (wrap.kind !== "wrapping") return;
    timeoutRef.current = window.setTimeout(() => {
      setWrap({ kind: "stuck" });
    }, EVAL_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [wrap.kind]);

  // Step 1: dedupe by streamInfo.id (latest text wins for live updates),
  // sort by timestamp.
  // Step 2: merge consecutive same-role segments into a single "turn" so
  // Deepgram's interim finals don't render as a stream of fragmented bubbles.
  const turns: Turn[] = useMemo(() => {
    const localIdentity = localParticipant?.identity;
    const segMap = new Map<string, Segment>();
    for (const t of transcriptions) {
      const role: "agent" | "you" =
        t.participantInfo.identity === localIdentity ? "you" : "agent";
      segMap.set(t.streamInfo.id, {
        id: t.streamInfo.id,
        role,
        text: t.text,
        timestamp: t.streamInfo.timestamp,
      });
    }
    const segments = [...segMap.values()].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    const merged: Turn[] = [];
    for (const s of segments) {
      const last = merged[merged.length - 1];
      if (last && last.role === s.role && s.timestamp - last.timestamp < 8000) {
        last.text = `${last.text} ${s.text}`.replace(/\s+/g, " ").trim();
      } else {
        merged.push({
          id: s.id,
          role: s.role,
          text: s.text.trim(),
          timestamp: s.timestamp,
        });
      }
    }
    return merged;
  }, [transcriptions, localParticipant?.identity]);

  // Sticky-bottom auto-scroll.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastTurnText = turns[turns.length - 1]?.text ?? "";
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 140) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns.length, lastTurnText]);

  const endInterview = async () => {
    if (isEnding) return;
    setWrap({ kind: "wrapping", startedAt: Date.now() });
    try {
      const agentIdentity =
        [...room.remoteParticipants.values()].find(
          (p) => p.identity !== localParticipant.identity,
        )?.identity ?? "";

      if (!agentIdentity) {
        // The agent never joined or already left — nothing to wrap up.
        onLeave();
        return;
      }

      // Tell the agent to wrap up. The agent will speak a goodbye, run the
      // evaluator, and call us back via the "interview.evaluation" RPC.
      // The component unmounts when that RPC fires (App swaps to the report
      // screen), which clears our timeout.
      await localParticipant.performRpc({
        destinationIdentity: agentIdentity,
        method: "interview.end",
        payload: "",
      });
    } catch (err) {
      console.error("interview.end RPC failed", err);
      setWrap({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not reach the interviewer.",
      });
    }
  };

  const stateLabel: Record<string, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting",
    initializing: "Warming up",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };

  return (
    <div className="fade-in flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex flex-none items-center justify-between border-b border-hairline bg-ink/40 px-6 py-3.5 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
            Live Interview
          </p>
          <span className="text-mute/40">·</span>
          <p className="font-serif text-lg italic text-cream">{candidate}</p>
        </div>
        <div className="flex items-center gap-3">
          <StateBadge label={stateLabel[state] ?? state} state={state} />
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-mute sm:inline">
            {turns.length} turn{turns.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {/* Transcript: takes ALL the available height */}
      <main
        ref={scrollerRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-5xl">
          {turns.length === 0 ? (
            <div className="mt-24 flex flex-col items-center gap-4 text-cream-2/60">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-hairline bg-ink-2">
                <Loader2 className="h-5 w-5 animate-spin text-amber-glow" />
              </div>
              <p className="font-serif text-xl italic">
                Waiting for the interviewer to begin…
              </p>
            </div>
          ) : (
            <ul className="space-y-7">
              {turns.map((t, i) => (
                <ChatRow
                  key={t.id}
                  turn={t}
                  isLast={i === turns.length - 1}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Bottom dock — minimal, premium, always anchored. */}
      <footer className="flex-none border-t border-hairline bg-ink/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-8">
          <button
            onClick={() =>
              localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
            }
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4 ${
              isMicrophoneEnabled
                ? "border-hairline bg-ink-2 text-cream hover:bg-ink-3"
                : "border-amber-glow/40 bg-amber-glow/10 text-amber-glow hover:bg-amber-glow/15"
            }`}
            title={
              isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"
            }
          >
            {isMicrophoneEnabled ? (
              <Mic className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <MicOff className="h-4 w-4" strokeWidth={1.8} />
            )}
            <span className="hidden md:inline">
              {isMicrophoneEnabled ? "Mic on" : "Muted"}
            </span>
          </button>

          {/* Slim agent voice visualizer — fills the gap, can't push siblings off */}
          <div className="relative h-12 min-w-0 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-amber-glow/15 via-rose-glow/10 to-violet-glow/15 blur-2xl" />
            <div className="relative h-full w-full">
              <BarVisualizer
                state={state}
                trackRef={audioTrack}
                barCount={56}
                options={{ minHeight: 4 }}
                className="h-full w-full"
              />
            </div>
          </div>

          <button
            onClick={endInterview}
            disabled={isEnding}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-rose-glow/40 bg-rose-glow/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-glow/20 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            {isEnding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            )}
            <span className="hidden sm:inline">
              {isEnding ? "Wrapping up…" : "End interview"}
            </span>
          </button>
        </div>
      </footer>

      <WrapOverlay
        wrap={wrap}
        onRetry={() => setWrap({ kind: "idle" })}
        onLeave={onLeave}
      />
    </div>
  );
}

function WrapOverlay({
  wrap,
  onRetry,
  onLeave,
}: {
  wrap: WrapPhase;
  onRetry: () => void;
  onLeave: () => void;
}) {
  if (wrap.kind === "idle") return null;

  return (
    <div className="fade-in fixed inset-0 z-50 grid place-items-center bg-ink/80 px-6 backdrop-blur-md">
      <div className="surface edge w-full max-w-lg rounded-3xl p-8 text-center shadow-2xl">
        {wrap.kind === "wrapping" ? (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-glow/40 bg-gradient-to-br from-amber-glow/30 to-rose-glow/20 shadow-[0_0_40px_-8px_oklch(0.78_0.16_70_/_0.6)]">
              <Sparkles className="h-6 w-6 text-amber-glow" strokeWidth={1.6} />
            </div>
            <p className="mt-6 font-serif text-3xl italic text-cream">
              Generating your report
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream-2/70">
              The interviewer is wrapping up and analyzing the conversation.
              <br />
              This usually takes 5–15 seconds.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.24em] text-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-glow" />
              Please don't close this tab
            </div>
          </>
        ) : wrap.kind === "stuck" ? (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-glow/40 bg-amber-glow/10">
              <AlertTriangle
                className="h-6 w-6 text-amber-glow"
                strokeWidth={1.6}
              />
            </div>
            <p className="mt-6 font-serif text-3xl italic text-cream">
              This is taking longer than usual
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream-2/70">
              The evaluation hasn't arrived yet. It may still be on its way.
              You can keep waiting, or leave and check back later.
            </p>
            <div className="mt-7 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onLeave}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-ink-2 px-5 py-2.5 text-sm font-medium text-cream-2 hover:bg-ink-3 sm:w-auto"
              >
                Leave anyway
              </button>
              <button
                onClick={onRetry}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold sm:w-auto"
              >
                Keep waiting
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-rose-glow/40 bg-rose-glow/10">
              <AlertTriangle
                className="h-6 w-6 text-rose-100"
                strokeWidth={1.6}
              />
            </div>
            <p className="mt-6 font-serif text-3xl italic text-cream">
              We couldn't reach the interviewer
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream-2/70">
              {wrap.message}
            </p>
            <div className="mt-7 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onLeave}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-ink-2 px-5 py-2.5 text-sm font-medium text-cream-2 hover:bg-ink-3 sm:w-auto"
              >
                Back to start
              </button>
              <button
                onClick={onRetry}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold sm:w-auto"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatRow({ turn, isLast }: { turn: Turn; isLast: boolean }) {
  const isAgent = turn.role === "agent";
  return (
    <li
      className={`fade-in flex items-start gap-4 ${
        isAgent ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <Avatar role={turn.role} />
      <div className="max-w-[78%]">
        <p
          className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isAgent
              ? "text-right text-amber-glow/85"
              : "text-mint-glow/85"
          }`}
        >
          {isAgent ? "Interviewer" : "Candidate"}
        </p>
        <div
          className={`relative rounded-2xl px-4 py-3 text-[15px] leading-relaxed text-cream shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] ${
            isAgent
              ? "rounded-tr-sm border border-amber-glow/20 bg-gradient-to-br from-amber-glow/[0.07] to-amber-glow/[0.02]"
              : "rounded-tl-sm border border-mint-glow/20 bg-gradient-to-br from-mint-glow/[0.07] to-mint-glow/[0.02]"
          }`}
        >
          <p className="whitespace-pre-wrap">{turn.text}</p>
          {isLast && (
            <span
              className={`absolute -bottom-1 ${
                isAgent ? "right-3" : "left-3"
              } h-1.5 w-1.5 rounded-full ${
                isAgent ? "bg-amber-glow/60" : "bg-mint-glow/60"
              } shadow-[0_0_10px] shadow-current`}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function Avatar({ role }: { role: "agent" | "you" }) {
  if (role === "agent") {
    return (
      <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-amber-glow/30 bg-gradient-to-br from-amber-glow/30 to-rose-glow/20 text-cream shadow-[0_8px_24px_-8px_oklch(0.78_0.16_70_/_0.6)]">
        <Bot className="h-4 w-4" strokeWidth={1.8} />
      </div>
    );
  }
  return (
    <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-mint-glow/30 bg-gradient-to-br from-mint-glow/30 to-violet-glow/20 text-cream shadow-[0_8px_24px_-8px_oklch(0.78_0.14_170_/_0.5)]">
      <User className="h-4 w-4" strokeWidth={1.8} />
    </div>
  );
}

function StateBadge({ label, state }: { label: string; state: string }) {
  const tone =
    state === "listening"
      ? "text-mint-glow"
      : state === "speaking"
        ? "text-amber-glow"
        : state === "thinking"
          ? "text-rose-glow"
          : "text-mute";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-ink-2/70 px-3 py-1.5 text-xs font-medium text-cream-2/85">
      <span
        className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${tone} bg-current`}
      />
      {label}
    </span>
  );
}
