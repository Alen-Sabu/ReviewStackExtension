import { getVsCodeApi } from "./vscodeApi";

export class VSCodeService {
  private readonly vscode = getVsCodeApi();

  send(type: string, payload: Record<string, unknown> = {}) {
    this.vscode.postMessage({
      type,
      ...payload,
    });
  }
}
