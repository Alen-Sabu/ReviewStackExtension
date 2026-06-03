declare function acquireVsCodeApi(): {
    postMessage(message: { type: string; [key: string]: unknown }): void;
};

export class VSCodeService {
    private readonly vscode = acquireVsCodeApi();

    send(type: string, payload: Record<string, unknown> = {}) {
        this.vscode.postMessage({
            type,
            ...payload,
        });
    }
}