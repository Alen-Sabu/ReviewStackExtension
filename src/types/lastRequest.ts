export type ReviewFunctionPayload = {
    filePath: string;
    code: string;
    language: string;
  };
  
  export type LastRequest =
    | { kind: "startReview"; payload: ReviewFunctionPayload }
    | { kind: "userMessage"; text: string };