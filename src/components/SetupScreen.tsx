import { useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  FileText,
  Loader2,
  Mic,
  Plus,
  User,
  Users,
  Waves,
  X,
} from "lucide-react";
import type { InterviewerProfile, SetupValues } from "../lib/types";

type Props = {
  onStart: (values: SetupValues) => Promise<void> | void;
  isStarting: boolean;
  error: string | null;
};

const PLACEHOLDER_JD = `Paste the job description here.

Leave blank to use the demo JD that ships with the project.`;

const PLACEHOLDER_RESUME = `Paste the candidate resume here (plain text).

Leave blank to use the demo resume.`;

const PLACEHOLDER_PANELIST = `Paste their LinkedIn here — About + Experience is plenty.

The agent uses it to shape question depth and topic mix, so it asks the kind of things this person actually cares about. It will not read the profile back to you.`;

// Keep this in lock-step with the backend's MAX_PANEL_SIZE-aware UI cap.
// We deliberately let users add fewer than the backend max so the form
// stays focused -- 4 is what most real onsite panels look like.
const MAX_PANEL_UI = 4;
// Higher than the agent's per-panelist trim threshold (3K) so users with
// long LinkedIn pastes don't get silently truncated by the form before the
// agent has a chance to do its own smart trim.
const MAX_PANELIST_PROFILE_CHARS = 8000;

// Stable, monotonic IDs for React keys so adding/removing rows doesn't
// shuffle DOM nodes and lose textarea focus.
let _panelistIdSeq = 0;
const newPanelist = (): InterviewerProfile & { _id: string } => ({
  _id: `panelist-${++_panelistIdSeq}`,
  name: "",
  profile: "",
});

type PanelistDraft = ReturnType<typeof newPanelist>;

export function SetupScreen({ onStart, isStarting, error }: Props) {
  const [name, setName] = useState("");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [panel, setPanel] = useState<PanelistDraft[]>([]);

  const addPanelist = () => {
    if (panel.length >= MAX_PANEL_UI) return;
    setPanel((p) => [...p, newPanelist()]);
  };

  const removePanelist = (id: string) => {
    setPanel((p) => p.filter((row) => row._id !== id));
  };

  const updatePanelist = (
    id: string,
    field: "name" | "profile",
    value: string,
  ) => {
    setPanel((p) =>
      p.map((row) => (row._id === id ? { ...row, [field]: value } : row)),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onStart({
      candidate_name: name.trim(),
      job_description: jd.trim(),
      resume: resume.trim(),
      // Strip the local _id, trim text, drop empty rows. The api layer
      // also defends against this, but doing it here keeps the SetupValues
      // contract clean for any caller that bypasses api.ts (e.g. tests).
      panel: panel
        .map(({ name: n, profile: p }) => ({
          name: n.trim(),
          profile: p.trim(),
        }))
        .filter((p) => p.profile.length > 0),
    });
  };

  return (
    <div className="fade-in mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-8 py-6 lg:px-14">
      {/* Top nav — wordmark + tagline pill */}
      <header className="flex flex-none items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl border border-hairline bg-ink-2">
            <Waves className="h-4 w-4 text-cream" strokeWidth={1.6} />
          </div>
          <p className="text-sm font-medium tracking-tight text-cream">
            Interview Taker
          </p>
          <span className="ml-2 hidden text-xs text-mute sm:inline">
            <span className="text-mute/40">·</span>{" "}
            <span className="font-serif italic">an AI voice interviewer</span>
          </span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-hairline bg-ink-2/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-mute sm:inline-flex">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-glow text-amber-glow" />
          Live · LiveKit + Gemini
        </div>
      </header>

      {/* Main hero — two columns. Left: copy + features. Right: form. */}
      <section className="mt-8 grid flex-1 items-center gap-10 lg:mt-4 lg:grid-cols-[1.05fr_minmax(0,1fr)] lg:gap-16 xl:gap-24">
        {/* LEFT — copy column */}
        <div className="flex flex-col">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-mute">
            AI Voice Interviewer
          </p>

          <h1 className="mt-5 text-balance text-5xl leading-[1.02] tracking-tight text-cream sm:text-6xl xl:text-7xl">
            A real interview,{" "}
            <span className="font-serif italic text-amber-glow">
              in real time.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-2/80 sm:text-lg">
            Drop in a job description and a resume. Our voice agent runs a
            tailored, fully spoken technical interview, then hands you a
            structured verdict — strengths, gaps, and a hire signal.
          </p>

          {/* Feature trio — sits right below the copy on the left column */}
          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            <Feature
              eyebrow="01"
              title="Personalized opener"
              body="The first line is drawn from the resume — no canned greetings."
            />
            <Feature
              eyebrow="02"
              title="Sub-second voice loop"
              body="Streaming STT, LLM and TTS keep it human."
            />
            <Feature
              eyebrow="03"
              title="Structured verdict"
              body="Strengths, gaps and a hire signal — as JSON."
            />
          </ul>

          <p className="mt-10 hidden text-[11px] tracking-wide text-mute/70 lg:block">
            Crafted with LiveKit Agents · Deepgram · Gemini
          </p>
        </div>

        {/* RIGHT — form column */}
        <form
          onSubmit={submit}
          className="surface edge fade-in relative w-full rounded-3xl p-6 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.7)] sm:p-7 xl:p-8"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl italic text-cream">
              Set up your interview
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-mute">
              ~20 min
            </span>
          </div>
          <p className="mt-1 text-sm text-mute">
            Anything you leave blank falls back to the demo data.
          </p>

          <div className="mt-6 grid gap-5">
            <Field label="Candidate" icon={<User className="h-3.5 w-3.5" />}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Their full name — e.g. Muhammad Sahil"
                className={inputClass}
                maxLength={120}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Job description"
              icon={<Briefcase className="h-3.5 w-3.5" />}
            >
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder={PLACEHOLDER_JD}
                rows={5}
                className={`${inputClass} font-mono text-[12.5px] leading-relaxed`}
                maxLength={20000}
              />
            </Field>

            <Field label="Resume" icon={<FileText className="h-3.5 w-3.5" />}>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder={PLACEHOLDER_RESUME}
                rows={5}
                className={`${inputClass} font-mono text-[12.5px] leading-relaxed`}
                maxLength={20000}
              />
            </Field>

            <PanelSection
              panel={panel}
              onAdd={addPanelist}
              onRemove={removePanelist}
              onUpdate={updatePanelist}
            />
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-rose-glow/40 bg-rose-glow/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-mute">
              <Mic className="h-3.5 w-3.5" />
              Microphone access required.
            </p>
            <button
              type="submit"
              disabled={isStarting}
              className="btn-primary group inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : (
                <>
                  Begin interview
                  <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Mobile-only footer credit (lg-and-up version sits in the left column) */}
      <p className="mt-10 pb-2 text-center text-[11px] tracking-wide text-mute/70 lg:hidden">
        Crafted with LiveKit Agents · Deepgram · Gemini
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-mute">
        <span className="text-mute/80">{icon}</span>
        {label}
      </div>
      {children}
    </label>
  );
}

function Feature({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-2xl border border-hairline bg-ink-2/40 p-4 backdrop-blur-sm transition hover:border-hairline-strong hover:bg-ink-2/70">
      <p className="font-serif text-base italic text-amber-glow/90">
        {eyebrow}
      </p>
      <p className="mt-2 text-sm font-medium text-cream">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-mute">{body}</p>
    </li>
  );
}

function PanelSection({
  panel,
  onAdd,
  onRemove,
  onUpdate,
}: {
  panel: PanelistDraft[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: "name" | "profile", value: string) => void;
}) {
  const isFull = panel.length >= MAX_PANEL_UI;

  return (
    <div className="block">
      {/* Header row mimics the <Field> label rhythm so it sits in the
          same visual column as JD / Resume above it. */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-mute">
          <Users className="h-3.5 w-3.5 text-mute/80" />
          Interviewer panel
          <span className="font-sans text-[10px] tracking-normal text-mute/60 normal-case">
            · optional
          </span>
        </div>
        {panel.length > 0 && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-mute/60">
            {panel.length} / {MAX_PANEL_UI}
          </span>
        )}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-mute">
        Paste each panelist's LinkedIn so the agent asks the kind of
        questions they actually ask. Up to {MAX_PANEL_UI} interviewers.
      </p>

      {panel.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-ink/30 px-3.5 py-3 text-sm text-mute transition hover:border-amber-glow/50 hover:bg-ink/60 hover:text-cream"
        >
          <Plus className="h-4 w-4" />
          Add an interviewer
        </button>
      ) : (
        <ul className="grid gap-3">
          {panel.map((p, idx) => (
            <PanelistCard
              key={p._id}
              index={idx}
              panelist={p}
              onRemove={() => onRemove(p._id)}
              onUpdate={(field, value) => onUpdate(p._id, field, value)}
            />
          ))}
        </ul>
      )}

      {panel.length > 0 && (
        <button
          type="button"
          onClick={onAdd}
          disabled={isFull}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-ink-2/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-mute transition hover:border-amber-glow/40 hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-mute"
        >
          <Plus className="h-3 w-3" />
          {isFull ? "Maximum reached" : "Add another"}
        </button>
      )}
    </div>
  );
}

function PanelistCard({
  index,
  panelist,
  onRemove,
  onUpdate,
}: {
  index: number;
  panelist: PanelistDraft;
  onRemove: () => void;
  onUpdate: (field: "name" | "profile", value: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-hairline bg-ink-2/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-hairline bg-ink/60 text-[10px] font-semibold text-mute">
            {index + 1}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
            Interviewer
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove interviewer ${index + 1}`}
          className="grid h-7 w-7 place-items-center rounded-full text-mute transition hover:bg-rose-glow/15 hover:text-rose-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-3">
        <input
          value={panelist.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder="Name (optional) — e.g. Priya Sharma"
          className={inputClass}
          maxLength={120}
          autoComplete="off"
        />
        <textarea
          value={panelist.profile}
          onChange={(e) => onUpdate("profile", e.target.value)}
          placeholder={PLACEHOLDER_PANELIST}
          rows={4}
          className={`${inputClass} font-mono text-[12.5px] leading-relaxed`}
          maxLength={MAX_PANELIST_PROFILE_CHARS}
        />
      </div>
    </li>
  );
}

const inputClass =
  "w-full rounded-xl border border-hairline bg-ink/60 px-3.5 py-2.5 text-sm text-cream placeholder:text-mute/60 outline-none transition focus:border-amber-glow/60 focus:bg-ink/80 focus:ring-2 focus:ring-amber-glow/15";
