export type RetrievedContextItem = {
  path: string;
  chars: number;
  reason?: string;
  truncated?: boolean;
  score?: number;
};

export type ReviewTiming = {
  retrieval_ms: number;
  ollama_call_ms: number;
  backend_total_ms: number;
};

export type OllamaTiming = {
  total_ms?: number | null;
  load_ms?: number | null;
  prompt_eval_ms?: number | null;
  eval_ms?: number | null;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
};

export type ReviewResponse = {
  message: string;
  needs_clarification: boolean;
  retrieved_context?: RetrievedContextItem[];
  context_limit_hit?: boolean;
  candidates_considered?: number;
  timing?: ReviewTiming;
  ollama_timing?: OllamaTiming;
};

export type ContextInfoPayload = {
  files: RetrievedContextItem[];
  limitHit: boolean;
  candidatesConsidered: number;
};
