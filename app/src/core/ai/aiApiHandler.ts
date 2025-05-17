// src/core/ai/aiApiHandler.ts
import { invoke, fetch } from "../../utils/tauriApi";
import { AiSettings } from "../../types/aiSettings";
import { TextNode } from "../stage/stageObject/entity/TextNode"; // Path might need adjustment
import { StageManager } from "../stage/stageManager/StageManager"; // Path might need adjustment

export namespace AiApiHandler {
  export async function fetchTextListForExpansion(selectedTextNode: TextNode): Promise<string[]> {
    try {
      const aiSettings: AiSettings = await invoke("load_ai_settings");
      console.log("aiSettings for expansion", aiSettings);

      const activeConfig = aiSettings.api_configs.find((config) => config.id === aiSettings.active_config_id);

      if (!activeConfig) {
        console.error("No active API configuration found.");
        return ["Error: No active API configuration found."];
      }

      const apiKey = activeConfig.api_key;
      const selectedModel = activeConfig.default_model;

      const apiUrl: string = activeConfig.endpoint_url
        ? `${activeConfig.endpoint_url}/chat/completions`
        : import.meta.env.LR_API_BASE_URL! + "/chat/completions";

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const messages: { role: string; content: string }[] = [];
      let systemMessageContent = aiSettings?.custom_prompts;

      if (systemMessageContent) {
        messages.push({ role: "system", content: systemMessageContent });
      } else {
        console.warn("No selected system prompt found or loaded. Using default system prompt.");
        systemMessageContent = "neko,一个联想家，请根据提供的词汇联想词汇，一行一个,仅仅输出联想即可";
        messages.push({ role: "system", content: systemMessageContent });
      }

      messages.push({
        role: "user",
        content: selectedTextNode.text,
      });

      const finalBody = {
        model: selectedModel,
        messages: messages,
      };

      console.log("Expansion - Final request body:", finalBody);
      console.log("Expansion - API URL:", apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(finalBody),
        });
        const responseData = await response.json();

        if (
          responseData &&
          responseData.choices &&
          responseData.choices.length > 0 &&
          responseData.choices[0].message
        ) {
          const content = responseData.choices[0].message.content;
          return content.split("\n").filter((line: string) => line.trim() !== "");
        } else {
          console.error("Unexpected chat completions response structure (Expansion):", responseData);
          return ["Error: Unexpected chat completions response structure"];
        }
      } catch (e) {
        console.error("Chat completions API error (Expansion):", e);
        return ["Error: Chat completions API error"];
      }
    } catch (e) {
      console.error("Error loading AI settings or processing API response (Expansion):", e);
      return ["Error: Failed to generate text"];
    }
  }

  export async function fetchSummaryForNodes(selectedTextNodes: TextNode[]): Promise<string> {
    try {
      const aiSettings: AiSettings = await invoke("load_ai_settings");
      const activeConfig = aiSettings.api_configs.find((config) => config.id === aiSettings.active_config_id);

      if (!activeConfig) {
        console.error("No active API configuration found for summary.");
        return "Error: No active API configuration found for summary.";
      }

      const apiKey = activeConfig.api_key;
      const selectedModel = activeConfig.default_model;
      const apiType = activeConfig.api_type;

      let apiUrl: string;
      let requestBody: any;
      const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
      let rawResponseText = "";

      const messages: { role: string; content: string }[] = [];
      const summaryPrompt = aiSettings.summary_prompt?.trim()
        ? aiSettings.summary_prompt
        : "用简洁的语言概括以下内容：";
      messages.push({ role: "system", content: summaryPrompt });

      let userMessageContent = "以下是选中的节点及其内容：\n";
      const selectedNodeUUIDs = selectedTextNodes.map((node) => node.uuid);
      selectedTextNodes.forEach((node) => {
        userMessageContent += `- ${node.uuid}: ${node.text}\n`;
      });
      userMessageContent += "\n以下是这些节点之间的连接关系：\n";
      let connectionsFound = false;
      // Assuming StageManager is accessible or passed if needed, or this logic moves
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

      switch (apiType) {
        case "gemini":
          if (!selectedModel) return "Error: Gemini model not selected for summary.";
          if (!activeConfig.endpoint_url) return "Error: Gemini endpoint URL not configured for summary.";
          apiUrl = `${activeConfig.endpoint_url}/models/${selectedModel}:generateContent`;
          if (apiKey) apiUrl += `?key=${apiKey}`;
          else return "Error: Gemini API key not configured for summary.";
          {
            let geminiPromptContent = "";
            if (messages.length > 0 && messages[0].role === "system") {
              geminiPromptContent = messages[0].content;
              if (messages.length > 1 && messages[1].role === "user") {
                geminiPromptContent += "\n\n" + messages[1].content;
              }
            } else if (messages.length > 0 && messages[0].role === "user") {
              geminiPromptContent = messages[0].content;
            } else {
              geminiPromptContent = userMessageContent;
            }
            requestBody = {
              contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
            };
          }
          break;
        case "responses":
          console.warn("Summarization is not supported for 'responses' API type.");
          return "Error: Summarization not supported for 'responses' API type.";
        case "chat":
        default:
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/chat/completions`
            : import.meta.env.LR_API_BASE_URL! + "/chat/completions";
          if (apiKey) requestHeaders["Authorization"] = `Bearer ${apiKey}`;
          requestBody = {
            model: selectedModel,
            messages: messages,
          };
          break;
      }

      console.log("Summary - API Type:", apiType);
      console.log("Summary - Final request body:", requestBody);
      console.log("Summary - API URL:", apiUrl);
      console.log("Summary - Request Headers:", requestHeaders);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        });

        try {
          rawResponseText = await response.clone().text();
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

        switch (apiType) {
          case "gemini":
            if (
              responseData &&
              responseData.candidates &&
              responseData.candidates.length > 0 &&
              responseData.candidates[0].content &&
              responseData.candidates[0].content.parts &&
              responseData.candidates[0].content.parts.length > 0
            ) {
              return responseData.candidates[0].content.parts[0].text;
            } else {
              console.error("Unexpected Gemini response structure for summary:", responseData, "Raw:", rawResponseText);
              return "Error: Unexpected Gemini response structure for summary";
            }
          case "chat":
          default:
            if (
              responseData &&
              responseData.choices &&
              responseData.choices.length > 0 &&
              responseData.choices[0].message &&
              responseData.choices[0].message.content
            ) {
              return responseData.choices[0].message.content;
            } else {
              console.error(
                "Unexpected Chat API response structure for summary:",
                responseData,
                "Raw:",
                rawResponseText,
              );
              return "Error: Unexpected Chat API response structure for summary";
            }
        }
      } catch (e) {
        console.error(
          `${apiType} API error during summary processing:`,
          e,
          "\nURL:",
          apiUrl,
          "\nRaw response attempt:",
          rawResponseText,
        );
        return `Error: Failed to process ${apiType} API summary response`;
      }
    } catch (e) {
      console.error("Error loading AI settings or processing summary API response:", e);
      return "Error: Failed to generate summary";
    }
  }
}
