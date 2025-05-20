// src/core/ai/helpers/types.ts
import { ApiConfig, AiSettings } from "../../../types/aiSettings";

// Represents the successfully retrieved active configuration and settings
export interface ActiveConfigAndSettings {
  config: ApiConfig; // Using ApiConfig directly as it's already specific
  settings: AiSettings;
}

// Result type for getting active AI configuration
export type GetActiveConfigResult = ActiveConfigAndSettings | { error: string };

// Details required to make an API request
export interface ApiRequestDetails {
  apiUrl: string;
  requestBody: any;
  requestHeaders: HeadersInit;
  apiType: string; // provider (e.g., "gemini", "chat", "responses")
  model?: string; // The model being used
}

// Result type for building an API request
export type BuildApiRequestResult = ApiRequestDetails | { error: string };

// For parsed expansion responses
export interface ParsedExpansionSuccess {
  suggestions: string[];
}
export type ParsedExpansionResult =
  | ParsedExpansionSuccess
  | { error: string; rawResponseText?: string; responseData?: any };

// For parsed summary responses
export interface ParsedSummarySuccess {
  summary: string;
}
export type ParsedSummaryResult =
  | ParsedSummarySuccess
  | { error: string; rawResponseText?: string; responseData?: any };

// A simplified representation of what we expect from tauriApi.fetch response
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
  clone: () => FetchResponseLike;
}
