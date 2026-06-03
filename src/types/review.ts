export type RetrievedContextItem = {
  path: string;
  chars: number;
  reason?: string;
  truncated?: boolean;
  score?: number;
};

export type ReviewResponse = {
  message: string;
  needs_clarification: boolean;
  retrieved_context?: RetrievedContextItem[];
  context_limit_hit?: boolean;
  candidates_considered?: number;
};

export type ContextInfoPayload = {
  files: RetrievedContextItem[];
  limitHit: boolean;
  candidatesConsidered: number;
};
