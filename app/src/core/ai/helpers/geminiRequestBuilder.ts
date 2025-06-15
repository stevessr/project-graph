// src/core/ai/helpers/geminiRequestBuilder.ts
import { TextNode } from "../../stage/stageObject/entity/TextNode";
import { ApiConfig, ResposeContent } from "../../../types/aiSettings";
import { BuildApiRequestResult } from "./types";

export function buildGeminiExpansionRequest(
  activeConfig: ApiConfig,
  messagesForApi: { role?: string; content: string | ResposeContent }[],
  selectedTextNode: TextNode,
): Partial<BuildApiRequestResult> | { error: string } {
  const { api_key, model, base_url } = activeConfig;

  if (!model) return { error: "Error: Gemini model not selected for expansion." };
  if (!base_url) return { error: "Error: Gemini endpoint URL not configured for expansion." };
  if (!api_key) return { error: "Error: Gemini API key not configured for expansion." };

  const apiUrl = `${base_url}/models/${model}:generateContent?key=${api_key}`;
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };

  let geminiPromptContent = "";
  if (
    messagesForApi.length > 0 &&
    messagesForApi[0].role === "system" &&
    typeof messagesForApi[0].content === "string"
  ) {
    geminiPromptContent = messagesForApi[0].content;
    if (
      messagesForApi.length > 1 &&
      messagesForApi[1].role === "user" &&
      typeof messagesForApi[1].content === "string"
    ) {
      geminiPromptContent += "\n\n" + messagesForApi[1].content;
    }
  } else if (
    messagesForApi.length > 0 &&
    messagesForApi[0].role === "user" &&
    typeof messagesForApi[0].content === "string"
  ) {
    geminiPromptContent = messagesForApi[0].content;
  } else {
    geminiPromptContent = selectedTextNode.text;
  }

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
  };

  return { apiUrl, requestBody, requestHeaders };
}

export function buildGeminiSummaryRequest(
  activeConfig: ApiConfig,
  messages: { role?: string; content: string }[],
): Partial<BuildApiRequestResult> | { error: string } {
  const { api_key, model, base_url } = activeConfig;

  if (!model) return { error: "Error: Gemini model not selected for summary." };
  if (!base_url) return { error: "Error: Gemini endpoint URL not configured for summary." };
  if (!api_key) return { error: "Error: Gemini API key not configured for summary." };

  const apiUrl = `${base_url}/models/${model}:generateContent?key=${api_key}`;
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };

  let geminiPromptContent = "";
  if (messages.length > 0 && messages[0].role === "system" && typeof messages[0].content === "string") {
    geminiPromptContent = messages[0].content;
    if (messages.length > 1 && messages[1].role === "user" && typeof messages[1].content === "string") {
      geminiPromptContent += "\n\n" + messages[1].content;
    }
  } else if (messages.length > 0 && messages[0].role === "user" && typeof messages[0].content === "string") {
    geminiPromptContent = messages[0].content;
  } else {
    geminiPromptContent = messages.find((m) => m.role === "user")?.content || "";
  }

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
  };

  return { apiUrl, requestBody, requestHeaders };
}
