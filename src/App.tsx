import { useCallback, useState } from "react";
import { SetupScreen } from "./components/SetupScreen";
import { LiveInterviewScreen } from "./components/LiveInterviewScreen";
import { EvaluationScreen } from "./components/EvaluationScreen";
import { fetchConnectionDetails } from "./lib/api";
import type {
  ConnectionDetails,
  InterviewEvaluation,
  SetupValues,
  TranscriptTurn,
} from "./lib/types";

type Phase =
  | { kind: "setup" }
  | { kind: "live"; connection: ConnectionDetails }
  | {
      kind: "result";
      evaluation: InterviewEvaluation;
      transcript: TranscriptTurn[];
    };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [isStarting, setIsStarting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const start = useCallback(async (values: SetupValues) => {
    setIsStarting(true);
    setSetupError(null);
    try {
      const conn = await fetchConnectionDetails(values);
      setPhase({ kind: "live", connection: conn });
    } catch (e) {
      setSetupError(
        e instanceof Error
          ? e.message
          : "Could not reach the token server. Is it running on :8000?",
      );
    } finally {
      setIsStarting(false);
    }
  }, []);

  const onEvaluation = useCallback(
    (evaluation: InterviewEvaluation, transcript: TranscriptTurn[]) => {
      setPhase({ kind: "result", evaluation, transcript });
    },
    [],
  );

  const reset = useCallback(() => {
    setPhase({ kind: "setup" });
  }, []);

  if (phase.kind === "setup") {
    return (
      <SetupScreen
        onStart={start}
        isStarting={isStarting}
        error={setupError}
      />
    );
  }

  if (phase.kind === "live") {
    return (
      <LiveInterviewScreen
        connection={phase.connection}
        onEvaluation={onEvaluation}
        onLeave={reset}
      />
    );
  }

  return (
    <EvaluationScreen
      evaluation={phase.evaluation}
      transcript={phase.transcript}
      onRestart={reset}
    />
  );
}
