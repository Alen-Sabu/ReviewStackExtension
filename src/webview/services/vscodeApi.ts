declare function acquireVsCodeApi(): {
  postMessage(message: { type: string; [key: string]: unknown }): void;
};

let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVsCodeApi(): ReturnType<typeof acquireVsCodeApi> {
  if (!api) {
    api = acquireVsCodeApi();
  }
  return api;
}
