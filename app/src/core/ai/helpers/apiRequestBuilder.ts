// src/core/ai/helpers/apiRequestBuilder.ts
import { TextNode } from "../../stage/stageObject/entity/TextNode";
import { StageManager } from "../../stage/stageManager/StageManager";
import { AiSettings, ApiConfig, ResposeContent } from "../../../types/aiSettings";
import { BuildApiRequestResult } from "./types";

function buildCommonMessagesForExpansion(
  selectedTextNodeText: string,
  aiSettings: AiSettings,
): { role?: string; content: string | ResposeContent; type?: string }[] {
  const messagesForApi: { role?: string; content: string | ResposeContent; type?: string }[] = [];
  const systemMessageContent = aiSettings?.custom_prompts?.trim()
    ? aiSettings.custom_prompts
    : "neko,一个联想家，请根据提供的词汇联想词汇，一行一个,仅仅输出联想即可";
  messagesForApi.push({ role: "system", content: systemMessageContent });
  messagesForApi.push({ role: "user", content: selectedTextNodeText });
  return messagesForApi;
}

function buildCommonMessagesForSummary(
  selectedTextNodes: TextNode[],
  aiSettings: AiSettings,
): { role?: string; content: string; type?: string }[] {
  const messages: { role?: string; content: string; type?: string }[] = [];
  const summary_prompt = aiSettings.summary_prompt?.trim() ? aiSettings.summary_prompt : "用简洁的语言概括以下内容：";
  messages.push({ role: "system", content: summary_prompt });

  let userMessageContent = "以下是选中的节点及其内容：\n";
  const selectedNodeUUIDs = selectedTextNodes.map((node) => node.uuid);
  selectedTextNodes.forEach((node) => {
    userMessageContent += `- ${node.uuid}: ${node.text}\n`;
  });
  userMessageContent += "\n以下是这些节点之间的连接关系：\n";
  let connectionsFound = false;
  StageManager.getLineEdges().forEach((edge) => {
    const sourceSelected = selectedNodeUUIDs.includes(edge.source.uuid);
    const targetSelected = selectedNodeUUIDs.includes(edge.target.uuid);
    if (sourceSelected && targetSelected) {
      userMessageContent += `- ${edge.source.uuid} -> ${edge.target.uuid}\n`;
      connectionsFound = true;
    }
  });
  if (!connectionsFound) {
    userMessageContent += "(选中的节点之间没有连接关系)\n";
  }
  userMessageContent += "\n请根据以上节点内容和它们之间的连接关系进行总结。";
  messages.push({ role: "user", content: userMessageContent });
  return messages;
}

export function buildExpansionRequest(
  activeConfig: ApiConfig,
  selectedTextNode: TextNode,
  aiSettings: AiSettings,
): BuildApiRequestResult {
  const api_key = activeConfig.api_key;
  const selectedModel = activeConfig.model;
  const apiType = activeConfig.provider;

  let apiUrl: string;
  let requestBody: any;
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };

  const messagesForApi = buildCommonMessagesForExpansion(selectedTextNode.text, aiSettings);

  switch (apiType) {
    case "gemini": {
      if (!selectedModel) return { error: "Error: Gemini model not selected for expansion." };
      if (!activeConfig.base_url) return { error: "Error: Gemini endpoint URL not configured for expansion." };
      apiUrl = `${activeConfig.base_url}/v1beta/models/${selectedModel}:generateContent`;
      if (api_key) apiUrl += `?key=${api_key}`;
      else return { error: "Error: Gemini API key not configured for expansion." };

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
      requestBody = {
        contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
      };
      break;
    }
    case "responses": {
      apiUrl = activeConfig.base_url
        ? `${activeConfig.base_url}/responses`
        : (import.meta.env.LR_API_BASE_URL || "") + "/responses";
      if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

      let inputPayload;
      if (messagesForApi && messagesForApi.length > 0) {
        inputPayload = messagesForApi.map((msg) => ({
          role: msg.role,
          content: { text: msg.content, type: "input_text" }, // Assuming content is string for 'text'
          type: "message",
        }));
      } else {
        console.warn("No valid input for 'responses' API expansion. Defaulting to an empty user message.");
        inputPayload = [{ role: "user", content: { text: "", type: "input_text" }, type: "message" }];
      }
      requestBody = { model: selectedModel, tools: [], input: inputPayload };
      break;
    }
    case "chat":
    default:
      apiUrl = activeConfig.base_url
        ? `${activeConfig.base_url}/chat/completions`
        : (import.meta.env.LR_API_BASE_URL || "") + "/chat/completions";
      if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;
      requestBody = {
        model: selectedModel,
        messages: messagesForApi.map((m) => ({ role: m.role || "user", content: m.content })),
        temperature: activeConfig.temperature === undefined ? 1.0 : activeConfig.temperature,
      };
      break;
  }
  return { apiUrl, requestBody, requestHeaders, apiType, model: selectedModel };
}

export function buildSummaryRequest(
  activeConfig: ApiConfig,
  selectedTextNodes: TextNode[],
  aiSettings: AiSettings,
): BuildApiRequestResult {
  const api_key = activeConfig.api_key;
  const selectedModel = activeConfig.model;
  const apiType = activeConfig.provider;

  let apiUrl: string;
  let requestBody: any;
  const requestHeaders: HeadersInit = { "Content-Type": "application/json" };

  const messages = buildCommonMessagesForSummary(selectedTextNodes, aiSettings);

  switch (apiType) {
    case "gemini":
      if (!selectedModel) return { error: "Error: Gemini model not selected for summary." };
      if (!activeConfig.base_url) return { error: "Error: Gemini endpoint URL not configured for summary." };
      apiUrl = `${activeConfig.base_url}/v1beta/models/${selectedModel}:generateContent`;
      if (api_key) apiUrl += `?key=${api_key}`;
      else return { error: "Error: Gemini API key not configured for summary." };
      {
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
        requestBody = {
          contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
        };
      }
      break;
    case "responses": {
      apiUrl = activeConfig.base_url
        ? `${activeConfig.base_url}/responses`
        : (import.meta.env.LR_API_BASE_URL || "") + "/responses";
      if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;

      // Original code for summary 'responses' used concatenated string, but this was before throwing an error.
      // For consistency and if 'responses' API can handle it, use message array structure.
      // If it strictly needs a single string: `input: (messages[0]?.content || "") + (messages[1]?.content || "")`
      // The original code for summary 'responses' throws an error *before* this point in aiApiHandler.
      // This builder part will still be defined for completeness if that policy changes.
      let inputPayload;
      if (messages && messages.length > 0) {
        inputPayload = messages.map((msg) => ({
          role: msg.role,
          content: { text: msg.content, type: "input_text" }, // Assuming content is string
          type: "message",
        }));
      } else {
        console.warn("No valid input for 'responses' API summary. Defaulting to an empty user message.");
        inputPayload = [{ role: "user", content: { text: "", type: "input_text" }, type: "message" }];
      }
      requestBody = { model: selectedModel, tools: [], input: inputPayload };
      break;
    }
    case "chat":
    default:
      apiUrl = activeConfig.base_url
        ? `${activeConfig.base_url}/chat/completions`
        : (import.meta.env.LR_API_BASE_URL || "") + "/chat/completions";
      if (api_key) requestHeaders["Authorization"] = `Bearer ${api_key}`;
      requestBody = {
        model: selectedModel,
        messages: messages.map((m) => ({ role: m.role || "user", content: m.content })),
        temperature: activeConfig.temperature === undefined ? 1.0 : activeConfig.temperature,
      };
      break;
  }
  return { apiUrl, requestBody, requestHeaders, apiType, model: selectedModel };
}
