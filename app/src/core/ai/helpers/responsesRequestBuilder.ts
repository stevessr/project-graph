// src/core/ai/helpers/responsesRequestBuilder.ts
import { ApiConfig, ResposeContent } from "../../../types/aiSettings";
import { BuildApiRequestResult } from "./types";

export function buildResponsesExpansionRequest(
  activeConfig: ApiConfig,
  messagesForApi: { role?: string; content: string | ResposeContent }[],
): Partial<BuildApiRequestResult> {
  const { api_key, model, base_url } = activeConfig;
  const apiUrl = base_url ? `${base_url}/responses` : "/responses";
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
  if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

  let inputPayload;
  if (messagesForApi && messagesForApi.length > 0) {
    inputPayload = messagesForApi.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  } else {
    console.warn("No valid input for 'responses' API expansion. Defaulting to an empty user message.");
    inputPayload = [{ role: "user", content: { text: "", type: "input_text" }, type: "message" }];
  }

  const requestBody = { model, tools: [], input: inputPayload };
  return { apiUrl, requestBody, requestHeaders };
}

export function buildResponsesSummaryRequest(
  activeConfig: ApiConfig,
  messages: { role?: string; content: string }[],
): Partial<BuildApiRequestResult> {
  const { api_key, model, base_url } = activeConfig;
  const apiUrl = base_url ? `${base_url}/responses` : "/responses";
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
  if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

  let inputPayload;
  if (messages && messages.length > 0) {
    inputPayload = messages.map((msg) => ({
      role: msg.role,
      content: { text: msg.content, type: "input_text" },
      type: "message",
    }));
  } else {
    console.warn("No valid input for 'responses' API summary. Defaulting to an empty user message.");
    inputPayload = [{ role: "user", content: { text: "", type: "input_text" }, type: "message" }];
  }

  const requestBody = { model, tools: [], input: inputPayload };
  return { apiUrl, requestBody, requestHeaders };
}
