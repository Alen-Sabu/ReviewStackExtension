import * as vscode from "vscode";
import { CONFIG } from "./config";

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
}): Promise<{ message: string; needs_clarification: boolean }> {
  const res = await fetch(`${CONFIG.serverUrl}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json() as { detail?: string };
    throw new Error(err.detail ?? "Review request failed");
  }

  return res.json() as Promise<{ message: string; needs_clarification: boolean }>;
}