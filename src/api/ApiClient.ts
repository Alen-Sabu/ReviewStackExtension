import { AuthService } from "../services/AuthService";
import type { ReviewResponse, ReviewStreamChunk } from "../types/review";
import { CONFIG } from "../utils/config";

export type ReviewPayload = {
  repo_path: string;
  file_path: string;
  function_code: string;
  language: string;
  conversation: { role: string; content: string }[];
  user_reply?: string;
};

export type FeedbackPayload = {
  repo_path: string;
  message_id: string;
  value: "up" | "down";
  preview?: string;
  file_path?: string;
};

export class ApiClient {
  constructor(private readonly auth: AuthService) {}

  async indexRepo(repoPath: string): Promise<number> {
    const response = await this.auth.authFetch(`${CONFIG.serverUrl}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_path: repoPath }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { detail?: string };
      throw new Error(error.detail ?? response.statusText);
    }

    const data = (await response.json()) as { file_count: number };
    return data.file_count;
  }

  async reviewFunction(payload: ReviewPayload): Promise<ReviewResponse> {
    const start = performance.now();
    const response = await this.auth.authFetch(
      `${CONFIG.serverUrl}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { detail?: string };
      throw new Error(error.detail ?? "Review request failed");
    }

    const data = (await response.json()) as ReviewResponse;
    logReviewTiming(Math.round(performance.now() - start), data);
    return data;
  }

  async reviewFunctionStream(
    payload: ReviewPayload,
    onChunk: (chunk: ReviewStreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<ReviewResponse> {
    const start = performance.now();
    const response = await this.auth.authFetch(
      `${CONFIG.serverUrl}/review/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { detail?: string };
      throw new Error(error.detail ?? "Review request failed");
    }

    if (!response.body) {
      throw new Error("Review request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let finalChunk: ReviewStreamChunk | null = null;

    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      }

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

  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    const response = await this.auth.authFetch(
      `${CONFIG.serverUrl}/feedback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_path: payload.repo_path,
          message_id: payload.message_id,
          value: payload.value,
          preview: payload.preview ?? "",
          file_path: payload.file_path ?? "",
        }),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { detail?: string };
      throw new Error(error.detail ?? "Feedback submission failed");
    }
  }
}

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
    const timing = data.ollama_timing;
    console.log(
      "[timing][ollama]",
      `total_ms=${timing.total_ms}`,
      `load_ms=${timing.load_ms}`,
      `prompt_eval_ms=${timing.prompt_eval_ms}`,
      `eval_ms=${timing.eval_ms}`,
      `tokens=${timing.prompt_tokens}→${timing.output_tokens}`,
    );
  }
}
