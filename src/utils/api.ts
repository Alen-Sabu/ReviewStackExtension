import { CONFIG } from "./config";
import type { ReviewResponse } from "../types/review";

export type {
  ReviewResponse,
  RetrievedContextItem,
  ContextInfoPayload,
} from "../types/review";

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

export async function reviewFunction(payload: {
  repo_path: string;
  file_path: string;
  function_code: string;
  language: string;
  conversation: { role: string; content: string }[];
  user_reply?: string;
}): Promise<ReviewResponse> {
  try {
    const start = performance.now();
    const res = await fetch(`${CONFIG.serverUrl}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const end = performance.now();
    console.log(`Review function took ${end - start} milliseconds`);
    return res.json() as Promise<ReviewResponse>;
  }catch (error) {
    const err = error as { detail?: string };
    throw new Error(err.detail ?? "Review request failed");
  }
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
