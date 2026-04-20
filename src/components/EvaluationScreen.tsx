import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  RotateCcw,
  Star,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import type {
  InterviewEvaluation,
  RecommendedDecision,
  SkillAssessment,
  TranscriptTurn,
} from "../lib/types";

type Props = {
  evaluation: InterviewEvaluation;
  transcript?: TranscriptTurn[];
  onRestart: () => void;
};

const DECISION_LABELS: Record<RecommendedDecision, string> = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  lean_hire: "Lean Hire",
  no_hire: "No Hire",
  strong_no_hire: "Strong No Hire",
};

const DECISION_TONE: Record<RecommendedDecision, string> = {
  strong_hire:
    "from-mint-glow/30 to-mint-glow/5 text-mint-glow border-mint-glow/40",
  hire: "from-mint-glow/25 to-amber-glow/5 text-mint-glow border-mint-glow/35",
  lean_hire:
    "from-amber-glow/25 to-amber-glow/5 text-amber-glow border-amber-glow/35",
  no_hire: "from-rose-glow/25 to-rose-glow/5 text-rose-100 border-rose-glow/40",
  strong_no_hire:
    "from-rose-glow/35 to-rose-glow/10 text-rose-100 border-rose-glow/50",
};

export function EvaluationScreen({
  evaluation,
  transcript,
  onRestart,
}: Props) {
  const baseFilename =
    evaluation.candidate_name.replace(/\s+/g, "_") || "candidate";
  const hasTranscript = !!transcript && transcript.length > 0;

  const triggerDownload = (
    contents: string,
    mime: string,
    filename: string,
  ) => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    triggerDownload(
      JSON.stringify(evaluation, null, 2),
      "application/json",
      `${baseFilename}_evaluation.json`,
    );
  };

  const downloadTranscript = () => {
    if (!transcript || transcript.length === 0) return;
    const lines: string[] = [
      `Interview Transcript`,
      `Candidate: ${evaluation.candidate_name}`,
      `Role: ${evaluation.role}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `---`,
      ``,
    ];
    for (const t of transcript) {
      const label = t.role === "agent" ? "INTERVIEWER" : "CANDIDATE";
      lines.push(`${label}:`);
      lines.push(t.text);
      lines.push("");
    }
    triggerDownload(
      lines.join("\n"),
      "text/plain;charset=utf-8",
      `${baseFilename}_transcript.txt`,
    );
  };

  return (
    <div className="fade-in mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      {/* Eyebrow */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-mute">
        Evaluation Report
      </p>

      {/* Candidate name as a magazine headline */}
      <h1 className="mt-4 text-balance text-5xl leading-[1.05] tracking-tight text-cream sm:text-7xl">
        <span className="font-serif italic text-cream-2">
          {evaluation.candidate_name}
        </span>
      </h1>
      <p className="mt-3 text-base text-cream-2/70">
        Interviewed for{" "}
        <span className="text-cream">{evaluation.role}</span>
      </p>

      {/* Top action row */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={downloadJson}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-ink-2 px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink-3"
        >
          <Download className="h-4 w-4" strokeWidth={1.8} />
          Evaluation JSON
        </button>
        <button
          onClick={downloadTranscript}
          disabled={!hasTranscript}
          title={
            hasTranscript
              ? "Download the full interview transcript as text"
              : "No transcript available"
          }
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-ink-2 px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" strokeWidth={1.8} />
          Transcript
        </button>
        <button
          onClick={onRestart}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
          New interview
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Verdict + summary */}
      <section className="mt-10 grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="surface edge relative overflow-hidden rounded-3xl p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
            Overall
          </p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-serif text-7xl italic text-amber-glow">
              {evaluation.overall_rating}
            </span>
            <span className="text-2xl text-mute/60">/5</span>
          </div>
          <RatingStars value={evaluation.overall_rating} className="mt-3" />
          <span
            className={`mt-6 inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-r px-3 py-1.5 text-xs font-semibold ${
              DECISION_TONE[evaluation.recommended_decision]
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2} />
            {DECISION_LABELS[evaluation.recommended_decision]}
          </span>
        </div>

        <div className="surface edge rounded-3xl p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
            Summary
          </p>
          <p className="mt-3 text-[17px] leading-[1.65] text-cream-2/90">
            <span className="font-serif text-2xl italic text-amber-glow">
              &ldquo;
            </span>
            {evaluation.summary}
            <span className="font-serif text-2xl italic text-amber-glow">
              &rdquo;
            </span>
          </p>
        </div>
      </section>

      {/* Strengths / Weaknesses */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <ListCard
          title="Strengths"
          icon={
            <CheckCircle2
              className="h-4 w-4 text-mint-glow"
              strokeWidth={1.8}
            />
          }
          tone="mint"
          items={evaluation.strengths}
        />
        <ListCard
          title="Areas to grow"
          icon={
            <TriangleAlert
              className="h-4 w-4 text-rose-glow"
              strokeWidth={1.8}
            />
          }
          tone="rose"
          items={evaluation.weaknesses}
        />
      </section>

      {/* Skill assessments */}
      <section className="surface edge mt-6 rounded-3xl p-7">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
            Skill assessments
          </h3>
          <span className="text-xs text-mute">
            {evaluation.skill_assessments.length} signal
            {evaluation.skill_assessments.length === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {evaluation.skill_assessments.map((s) => (
            <SkillCard key={s.skill} item={s} />
          ))}
        </ul>
      </section>

      {/* Recommendations */}
      <section className="surface edge mt-6 rounded-3xl p-7">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
          Focus next on
        </h3>
        <ol className="mt-5 space-y-4">
          {evaluation.recommendations.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-4 text-[15px] leading-relaxed text-cream-2/85"
            >
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full border border-amber-glow/30 bg-amber-glow/10 font-serif text-sm italic text-amber-glow">
                {i + 1}
              </span>
              <span className="pt-0.5">{r}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-14 text-center text-[11px] tracking-wide text-mute/70">
        Generated by Gemini structured output · One signal, not the verdict.
      </p>
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "mint" | "rose";
}) {
  const dot = tone === "mint" ? "bg-mint-glow/70" : "bg-rose-glow/70";
  return (
    <div className="surface edge rounded-3xl p-7">
      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-mute">
        {icon}
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {items.length === 0 && (
          <li className="font-serif text-base italic text-mute/70">
            Nothing flagged.
          </li>
        )}
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[14.5px] leading-relaxed text-cream-2/85"
          >
            <span
              className={`mt-2 inline-block h-1.5 w-1.5 flex-none rounded-full ${dot}`}
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillCard({ item }: { item: SkillAssessment }) {
  return (
    <li className="rounded-2xl border border-hairline bg-ink-2/40 p-5 transition hover:border-hairline-strong hover:bg-ink-2/70">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-lg italic text-cream">{item.skill}</p>
        <span className="font-serif text-sm italic text-amber-glow">
          {item.rating}
          <span className="text-mute">/5</span>
        </span>
      </div>
      <RatingBars value={item.rating} className="mt-3" />
      <p className="mt-3 text-[13px] leading-relaxed text-cream-2/70">
        {item.evidence}
      </p>
    </li>
  );
}

function RatingStars({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${
            n <= value
              ? "fill-amber-glow text-amber-glow"
              : "text-hairline-strong"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function RatingBars({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-1 flex-1 rounded-full ${
            n <= value
              ? "bg-gradient-to-r from-amber-glow to-rose-glow"
              : "bg-hairline-strong"
          }`}
        />
      ))}
    </div>
  );
}
