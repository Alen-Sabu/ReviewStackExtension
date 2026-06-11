import { CONFIG } from "./config";
import type { ReviewResponse, ReviewStreamChunk } from "../types/review";

export type {
  ReviewResponse,
  RetrievedContextItem,
  ContextInfoPayload,
  ReviewStreamChunk,
} from "../types/review";

type ReviewPayload = {
  repo_path: string;
  file_path: string;
  function_code: string;
  language: string;
  conversation: { role: string; content: string }[];
  user_reply?: string;
};

function logReviewTiming(
  clientTotalMs: number,
  data: Pick<ReviewResponse, "timing" | "ollama_timing">,
): void {
  console.log("[timing][client] round_trip_ms=", clientTotalMs);
  if (data.timing) {
    console.log(
      "[timing][backend]",
      `retrieval_ms=${data.timing.retrieval_ms}`,
      `ollama_call_ms=${data.timing.ollama_call_ms}`,
      `backend_total_ms=${data.timing.backend_total_ms}`,
    );
  }
  if (data.ollama_timing) {
    const o = data.ollama_timing;
    console.log(
      "[timing][ollama]",
      `total_ms=${o.total_ms}`,
      `load_ms=${o.load_ms}`,
      `prompt_eval_ms=${o.prompt_eval_ms}`,
      `eval_ms=${o.eval_ms}`,
      `tokens=${o.prompt_tokens}→${o.output_tokens}`,
    );
  }
}

export async function indexRepo(repoPath: string): Promise<number> {
  const res = await fetch(`${CONFIG.serverUrl}/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_path: repoPath }),
  });

  if (!res.ok) {
    const err = await res.json() as { detail?: string };
    throw new Error(err.detail ?? res.statusText);
  }

  const data = await res.json() as { file_count: number };
  return data.file_count;
}

export async function reviewFunction(payload: ReviewPayload): Promise<ReviewResponse> {
  const start = performance.now();
  const res = await fetch(`${CONFIG.serverUrl}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json() as { detail?: string };
    throw new Error(err.detail ?? "Review request failed");
  }

  const data = await res.json() as ReviewResponse;
  logReviewTiming(Math.round(performance.now() - start), data);
  return data;
}

export async function reviewFunctionStream(
  payload: ReviewPayload,
  onChunk: (chunk: ReviewStreamChunk) => void,
): Promise<ReviewResponse> {
  const start = performance.now();
  const res = await fetch(`${CONFIG.serverUrl}/review/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json() as { detail?: string };
    throw new Error(err.detail ?? "Review request failed");
  }

  if (!res.body) {
    throw new Error("Review request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finalChunk: ReviewStreamChunk | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      const chunk = JSON.parse(line.slice(6)) as ReviewStreamChunk;
      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (chunk.delta) {
        fullText += chunk.delta;
      }

      onChunk(chunk);

      if (chunk.done) {
        finalChunk = chunk;
      }
    }
  }

  const result: ReviewResponse = {
    message: fullText,
    needs_clarification: finalChunk?.needs_clarification ?? false,
    suggested_code: finalChunk?.suggested_code ?? null,
    suggested_language: finalChunk?.suggested_language ?? null,
    retrieved_context: finalChunk?.retrieved_context,
    context_limit_hit: finalChunk?.context_limit_hit,
    candidates_considered: finalChunk?.candidates_considered,
    timing: finalChunk?.timing,
    ollama_timing: finalChunk?.ollama_timing,
  };

  logReviewTiming(Math.round(performance.now() - start), result);
  return result;
}

export async function submitFeedback(payload: {
  repo_path: string;
  message_id: string;
  value: "up" | "down";
  preview?: string;
  file_path?: string;
}): Promise<void> {
  const res = await fetch(`${CONFIG.serverUrl}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_path: payload.repo_path,
      message_id: payload.message_id,
      value: payload.value,
      preview: payload.preview ?? "",
      file_path: payload.file_path ?? "",
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { detail?: string };
    throw new Error(err.detail ?? "Feedback submission failed");
  }
}
