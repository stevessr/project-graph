// src/core/ai/aiApiHandler.ts
import { TextNode } from "../stage/stageObject/entity/TextNode";
import { Dialog } from "../../components/dialog";

// Helper imports
import { getActiveAiConfiguration } from "./helpers/aiSettingsManager";
import { buildExpansionRequest, buildSummaryRequest } from "./helpers/apiRequestBuilder";
import { makeApiCall } from "./helpers/apiCaller";
import { parseExpansionResponse, parseSummaryResponse } from "./helpers/apiResponseParser";
import { FetchResponseLike } from "./helpers/types"; // For response type

export namespace AiApiHandler {
  export async function fetchTextListForExpansion(selectedTextNode: TextNode): Promise<string[]> {
    try {
      const activeConfigResult = await getActiveAiConfiguration();
      if ("error" in activeConfigResult) {
        console.error("fetchTextListForExpansion: ActiveConfigError:", activeConfigResult.error);
        return [`Error: ${activeConfigResult.error}`];
      }
      const { config: activeConfig, settings: aiSettings } = activeConfigResult;

      const requestDetailsResult = buildExpansionRequest(activeConfig, selectedTextNode, aiSettings);
      if ("error" in requestDetailsResult) {
        console.error("fetchTextListForExpansion: RequestBuildError:", requestDetailsResult.error);
        return [requestDetailsResult.error];
      }
      const { apiUrl, requestBody, requestHeaders, apiType } = requestDetailsResult;

      if (apiType === "responses") {
        await Dialog.show({
          title: "提示",
          content: "当前 'responses' API 类型用于文本扩展的功能尚未完全验证，可能无法按预期工作。",
        });
      }

      console.log(`Expansion (${apiType}) - Final request body:`, JSON.stringify(requestBody, null, 2));
      console.log(`Expansion (${apiType}) - API URL:`, apiUrl);
      console.log(`Expansion (${apiType}) - Request Headers:`, requestHeaders);

      let rawResponseText = "";
      let response: FetchResponseLike;
      try {
        response = await makeApiCall(apiUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        });

        try {
          // It's crucial to clone if you need to access the body multiple times (e.g., for text and then json)
          const clonedResponse = response.clone();
          rawResponseText = await clonedResponse.text();
        } catch (textError) {
          console.warn(`Could not get raw text from ${apiType} expansion response:`, textError);
          // rawResponseText will remain empty or its last value
        }

        if (!response.ok) {
          console.error(
            `${apiType} API expansion request failed with status ${response.status}: ${response.statusText}`,
            "\nURL:",
            apiUrl,
            "\nRaw response:",
            rawResponseText,
          );
          return [`Error: ${apiType} API expansion request failed (${response.status})`];
        }

        if (rawResponseText.trim() === "") {
          console.error(
            `${apiType} API expansion returned empty content.`,
            "\nURL:",
            apiUrl,
            "\nRaw response:",
            `"${rawResponseText}"`,
          );
          return [`Error: ${apiType} API expansion returned no content`];
        }

        // Use the original response object for .json() as clone().text() consumed the cloned body
        const responseData = await response.json();
        const parsedResult = await parseExpansionResponse(apiType, responseData, rawResponseText);

        if ("error" in parsedResult) {
          console.error(
            "fetchTextListForExpansion: ParseError:",
            parsedResult.error,
            "Raw:",
            parsedResult.rawResponseText,
          );
          if (apiType === "responses" && parsedResult.error.includes("Unexpected 'responses' API response structure")) {
            await Dialog.show({
              title: "错误",
              content: "无法解析来自 'responses' API 的扩展结果。请检查控制台日志。",
            });
          }
          return [`Error: ${parsedResult.error}`];
        }
        return parsedResult.suggestions;
      } catch (e: any) {
        // This catch handles errors from makeApiCall or response.json()
        console.error(
          `${apiType} API error (Expansion):`,
          e,
          "\nURL:",
          apiUrl,
          "\nRaw response attempt:",
          rawResponseText,
        );
        return [`Error: ${apiType} API error - ${e.message || "Unknown error"}`];
      }
    } catch (e: any) {
      // This top-level catch is for unexpected errors in the setup, e.g. if a helper throws an unhandled exception
      console.error("Critical error in fetchTextListForExpansion:", e);
      return [`Error: Failed to generate text - ${e.message || "Unknown error"}`];
    }
  }

  export async function fetchSummaryForNodes(selectedTextNodes: TextNode[]): Promise<string> {
    try {
      const activeConfigResult = await getActiveAiConfiguration();
      if ("error" in activeConfigResult) {
        console.error("fetchSummaryForNodes: ActiveConfigError:", activeConfigResult.error);
        return `Error: ${activeConfigResult.error}`;
      }
      const { config: activeConfig, settings: aiSettings } = activeConfigResult;

      const requestDetailsResult = buildSummaryRequest(activeConfig, selectedTextNodes, aiSettings);
      if ("error" in requestDetailsResult) {
        console.error("fetchSummaryForNodes: RequestBuildError:", requestDetailsResult.error);
        return requestDetailsResult.error;
      }
      const { apiUrl, requestBody, requestHeaders, apiType } = requestDetailsResult;

      if (apiType === "responses") {
        await Dialog.show({ title: "提示", content: "暂时不能使用responses格式进行总结，我还没搞明白" });
        return "Error: 暂时不能使用responses格式进行总结，我还没搞明白"; // As per original logic
      }

      console.log("Summary - API Type:", apiType);
      console.log("Summary - Final request body:", JSON.stringify(requestBody, null, 2));
      console.log("Summary - API URL:", apiUrl);
      console.log("Summary - Request Headers:", requestHeaders);

      let rawResponseText = "";
      let response: FetchResponseLike;
      try {
        response = await makeApiCall(apiUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        });

        try {
          const clonedResponse = response.clone();
          rawResponseText = await clonedResponse.text();
        } catch (textError) {
          console.warn("Could not get raw text from summary response:", textError);
        }

        if (!response.ok) {
          console.error(
            `${apiType} API summary request failed with status ${response.status}: ${response.statusText}`,
            "\nURL:",
            apiUrl,
            "\nRaw response:",
            rawResponseText,
          );
          return `Error: ${apiType} API summary request failed (${response.status})`;
        }

        if (rawResponseText.trim() === "") {
          console.error(
            `${apiType} API summary returned empty content.`,
            "\nURL:",
            apiUrl,
            "\nRaw response:",
            `"${rawResponseText}"`,
          );
          return `Error: ${apiType} API summary returned no content`;
        }

        const responseData = await response.json();
        const parsedResult = await parseSummaryResponse(apiType, responseData, rawResponseText);

        if ("error" in parsedResult) {
          console.error("fetchSummaryForNodes: ParseError:", parsedResult.error, "Raw:", parsedResult.rawResponseText);
          return `Error: ${parsedResult.error}`;
        }
        return parsedResult.summary;
      } catch (e: any) {
        console.error(
          `${apiType} API error during summary processing:`,
          e,
          "\nURL:",
          apiUrl,
          "\nRaw response attempt:",
          rawResponseText,
        );
        return `Error: Failed to process ${apiType} API summary response - ${e.message || "Unknown error"}`;
      }
    } catch (e: any) {
      console.error("Critical error in fetchSummaryForNodes:", e);
      return `Error: Failed to generate summary - ${e.message || "Unknown error"}`;
    }
  }
}
