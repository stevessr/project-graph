// src/core/ai/helpers/apiRequestBuilder.ts
import { TextNode } from "../../stage/stageObject/entity/TextNode";
import { StageManager } from "../../stage/stageManager/StageManager";
import { AiSettings, ApiConfig } from "../../../types/aiSettings";
import { BuildApiRequestResult, ApiRequestDetails } from "./types";
import { buildChatExpansionRequest, buildChatSummaryRequest } from "./openaiRequestBuilder";
import { buildGeminiExpansionRequest, buildGeminiSummaryRequest } from "./geminiRequestBuilder";
import { buildClaudeExpansionRequest, buildClaudeSummaryRequest } from "./claudeRequestBuilder";
import { buildResponsesExpansionRequest, buildResponsesSummaryRequest } from "./responsesRequestBuilder";

// --- Common Message Builders ---

function buildCommonMessagesForExpansion(
  selectedTextNodeText: string,
  aiSettings: AiSettings,
): { role?: string; content: string; type?: string }[] {
  const messagesForApi: { role?: string; content: string; type?: string }[] = [];
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

// --- Main Dispatcher Functions ---

export function buildExpansionRequest(
  activeConfig: ApiConfig,
  selectedTextNode: TextNode,
  aiSettings: AiSettings,
): BuildApiRequestResult {
  const { provider: apiType, model } = activeConfig;
  const messagesForApi = buildCommonMessagesForExpansion(selectedTextNode.text, aiSettings);

  let result: Partial<BuildApiRequestResult> | { error: string };

  switch (apiType) {
    case "gemini":
      result = buildGeminiExpansionRequest(activeConfig, messagesForApi, selectedTextNode);
      break;
    case "responses":
      result = buildResponsesExpansionRequest(activeConfig, messagesForApi);
      break;
    case "claude":
      result = buildClaudeExpansionRequest(activeConfig, messagesForApi);
      break;
    case "openai":
    default:
      result = buildChatExpansionRequest(activeConfig, messagesForApi);
      break;
  }

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const finalResult = {
    ...result,
    apiType,
    model,
  } as BuildApiRequestResult;

  if ("error" in finalResult) {
    return finalResult;
  }

  const { tools } = activeConfig;
  if (tools && tools.length > 0) {
    (finalResult as ApiRequestDetails).requestBody.tools = tools;
  }

  return finalResult;
}

export function buildSummaryRequest(
  activeConfig: ApiConfig,
  selectedTextNodes: TextNode[],
  aiSettings: AiSettings,
): BuildApiRequestResult {
  const { provider: apiType, model } = activeConfig;
  const messages = buildCommonMessagesForSummary(selectedTextNodes, aiSettings);

  let result: Partial<BuildApiRequestResult> | { error: string };

  switch (apiType) {
    case "gemini":
      result = buildGeminiSummaryRequest(activeConfig, messages);
      break;
    case "responses":
      result = buildResponsesSummaryRequest(activeConfig, messages);
      break;
    case "claude":
      result = buildClaudeSummaryRequest(activeConfig, messages);
      break;
    case "openai":
    default:
      result = buildChatSummaryRequest(activeConfig, messages);
      break;
  }

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const finalResult = {
    ...result,
    apiType,
    model,
  } as BuildApiRequestResult;

  if ("error" in finalResult) {
    return finalResult;
  }

  const { tools } = activeConfig;
  if (tools && tools.length > 0) {
    (finalResult as ApiRequestDetails).requestBody.tools = tools;
  }

  return finalResult;
}
