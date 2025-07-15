// src/core/ai/helpers/openaiRequestBuilder.ts
import { ApiConfig, ResposeContent } from "../../../types/aiSettings";
import { BuildApiRequestResult } from "./types";

export function buildChatExpansionRequest(
  activeConfig: ApiConfig,
  messagesForApi: { role?: string; content: string | ResposeContent }[],
): Partial<BuildApiRequestResult> {
  const { api_key, temperature, model } = activeConfig;
  const apiUrl = activeConfig.base_url ? `${activeConfig.base_url}/chat/completions` : "/chat/completions";
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
  if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

  const requestBody = {
    model,
    messages: messagesForApi.map((m) => ({ role: m.role || "user", content: m.content })),
    temperature: temperature === undefined ? 1.0 : temperature,
  };

  return { apiUrl, requestBody, requestHeaders };
}

export function buildChatSummaryRequest(
  activeConfig: ApiConfig,
  messages: { role?: string; content: string }[],
): Partial<BuildApiRequestResult> {
  const { api_key, model, temperature } = activeConfig;
  const apiUrl = activeConfig.base_url ? `${activeConfig.base_url}/chat/completions` : "/chat/completions";
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
  if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

  const requestBody = {
    model,
    messages: messages.map((m) => ({ role: m.role || "user", content: m.content })),
    temperature: temperature === undefined ? 1.0 : temperature,
  };

  return { apiUrl, requestBody, requestHeaders };
}
