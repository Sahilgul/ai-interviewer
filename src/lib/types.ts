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

export type SetupValues = {
  candidate_name: string;
  job_description: string;
  resume: string;
};
