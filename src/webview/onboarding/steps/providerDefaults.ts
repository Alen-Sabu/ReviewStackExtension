import type { ProviderId } from "../../../types/provider";

type CloudProviderDefaults = {
  needsApiKey: true;
  model: string;
  keyUrl: string;
};

type OllamaProviderDefaults = {
  needsApiKey: false;
  model: string;
  baseUrl: string;
};

export type ProviderDefaults = CloudProviderDefaults | OllamaProviderDefaults;

export const PROVIDER_DEFAULTS: Record<ProviderId, ProviderDefaults> = {
  google: {
    needsApiKey: true,
    model: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  openai: {
    needsApiKey: true,
    model: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    needsApiKey: true,
    model: "claude-sonnet-4-20250514",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  deepseek: {
    needsApiKey: true,
    model: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  groq: {
    needsApiKey: true,
    model: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    needsApiKey: true,
    model: "openai/gpt-4o-mini",
    keyUrl: "https://openrouter.ai/keys",
  },
  azure: {
    needsApiKey: true,
    model: "gpt-4o-mini",
    keyUrl: "https://portal.azure.com/",
  },
  aws: {
    needsApiKey: true,
    model: "anthropic.claude-3-sonnet-20240229-v1:0",
    keyUrl: "https://console.aws.amazon.com/bedrock/",
  },
  ibm: {
    needsApiKey: true,
    model: "ibm/granite-3-8b-instruct",
    keyUrl: "https://cloud.ibm.com/iam/apikeys",
  },
  oracle: {
    needsApiKey: true,
    model: "cohere.command-r-plus",
    keyUrl: "https://cloud.oracle.com/",
  },
  ollama: {
    needsApiKey: false,
    model: "qwen2.5-coder:7b",
    baseUrl: "http://127.0.0.1:11434",
  },
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  groq: "Groq",
  openrouter: "OpenRouter",
  azure: "Azure OpenAI",
  aws: "AWS Bedrock",
  ibm: "IBM Watsonx",
  oracle: "Oracle OCI",
  ollama: "Ollama (Local)",
};

export function getDefaultModel(provider: ProviderId): string {
  return PROVIDER_DEFAULTS[provider].model;
}

export function needsApiKey(provider: ProviderId): boolean {
  return PROVIDER_DEFAULTS[provider].needsApiKey;
}

export const ENABLED_PROVIDERS: ProviderId[] = ["ollama", "google"];