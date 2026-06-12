export type ProviderId = 
    | "ollama"
    | "deepseek"
    | "google"
    | "openai"
    | "anthropic"
    | "groq"
    | "openrouter"
    | "azure"
    | "aws"
    | "ibm"
    | "oracle"

export type ProviderConfig = {
    provider: ProviderId;
    model: string;
    baseUrl?: string;
    onBoardingComplete?: boolean;
}

