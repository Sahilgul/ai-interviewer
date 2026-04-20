export type ConnectionDetails = {
  server_url: string;
  room_name: string;
  participant_token: string;
  participant_name: string;
};

export type SkillAssessment = {
  skill: string;
  rating: number; // 1..5
  evidence: string;
};

export type RecommendedDecision =
  | "strong_hire"
  | "hire"
  | "lean_hire"
  | "no_hire"
  | "strong_no_hire";

export type InterviewEvaluation = {
  candidate_name: string;
  role: string;
  overall_rating: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  skill_assessments: SkillAssessment[];
  recommendations: string[];
  recommended_decision: RecommendedDecision;
};

// Optional interviewer profile the candidate can paste in to make the
// agent's questions reflect a real panel (name optional, profile is the
// raw LinkedIn paste). Mirrored 1:1 by the backend pydantic model and
// by the agent's `_normalize_panel` in prompt.py.
export type InterviewerProfile = {
  name: string;
  profile: string;
};

export type SetupValues = {
  candidate_name: string;
  job_description: string;
  resume: string;
  panel: InterviewerProfile[];
};

export type TranscriptTurn = {
  role: "agent" | "you";
  text: string;
  timestamp: number;
};
