// src/core/ai/helpers/claudeRequestBuilder.ts
import { ApiConfig, ResposeContent } from "../../../types/aiSettings";
import { BuildApiRequestResult } from "./types";

export function buildClaudeExpansionRequest(
  activeConfig: ApiConfig,
  messagesForApi: { role?: string; content: string | ResposeContent }[],
): Partial<BuildApiRequestResult> | { error: string } {
  const { api_key, model, base_url, temperature } = activeConfig;

  if (!model) return { error: "Error: Claude model not selected for expansion." };
  if (!api_key) return { error: "Error: Claude API key not configured for expansion." };

  const apiUrl = base_url ? base_url + "/messages" : "https://api.anthropic.com/v1/messages";
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
  };

  let systemPrompt: string | undefined = undefined;
  const claudeApiMessages: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messagesForApi) {
    if (msg.role === "system" && typeof msg.content === "string") {
      systemPrompt = msg.content;
    } else if ((msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string") {
      claudeApiMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }

  const requestBody: any = {
    model,
    messages: claudeApiMessages,
    max_tokens: 1024,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (temperature !== undefined) {
    requestBody.temperature = temperature;
  }

  return { apiUrl, requestBody, requestHeaders };
}

export function buildClaudeSummaryRequest(
  activeConfig: ApiConfig,
  messages: { role?: string; content: string }[],
): Partial<BuildApiRequestResult> | { error: string } {
  const { api_key, model, base_url, temperature } = activeConfig;

  if (!model) return { error: "Error: Claude model not selected for summary." };
  if (!api_key) return { error: "Error: Claude API key not configured for summary." };

  const apiUrl = base_url || "https://api.anthropic.com/v1/messages";
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
  };

  let systemPrompt: string | undefined = undefined;
  const claudeApiMessages: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === "system" && typeof msg.content === "string") {
      systemPrompt = msg.content;
    } else if ((msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string") {
      claudeApiMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }

  const requestBody: any = {
    model,
    messages: claudeApiMessages,
    max_tokens: 1024,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (temperature !== undefined) {
    requestBody.temperature = temperature;
  }

  return { apiUrl, requestBody, requestHeaders };
}
