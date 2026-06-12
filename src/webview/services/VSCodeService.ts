import { getVsCodeApi } from "./vscodeApi";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class VSCodeService {
  private readonly vscode = getVsCodeApi();
  private readonly pending = new Map<string, PendingRequest>();

  constructor() {
    window.addEventListener("message", (event) => {
      const { type, requestId, payload, error } = event.data ?? {};
      if (type !== "response" || !requestId) {
        return;
      }

      const pending = this.pending.get(String(requestId));
      if (!pending) {
        return;
      }

      this.pending.delete(String(requestId));
      if (error) {
        pending.reject(new Error(String(error)));
        return;
      }
      pending.resolve(payload);
    });
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    this.vscode.postMessage({
      type,
      ...payload,
    });
  }

  request<T>(
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.vscode.postMessage({
        type,
        requestId,
        ...payload,
      });
    });
  }
}
