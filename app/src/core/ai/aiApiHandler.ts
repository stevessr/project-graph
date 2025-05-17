// src/core/ai/aiApiHandler.ts
import { invoke, fetch } from "../../utils/tauriApi";
import { AiSettings } from "../../types/aiSettings";
import { TextNode } from "../stage/stageObject/entity/TextNode"; // Path might need adjustment
import { StageManager } from "../stage/stageManager/StageManager"; // Path might need adjustment
import { Dialog } from "../../components/dialog";

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
      const apiType = activeConfig.api_type; // Get apiType

      let apiUrl: string;
      let requestBody: any;
      const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
      let rawResponseText = ""; // For debugging

      // Prepare messages (system and user)
      const messagesForApi: { role?: string; content: string; type?: string }[] = [];
      const systemMessageContent = aiSettings?.custom_prompts?.trim()
        ? aiSettings.custom_prompts
        : "neko,一个联想家，请根据提供的词汇联想词汇，一行一个,仅仅输出联想即可";
      messagesForApi.push({ role: "system", content: systemMessageContent });
      messagesForApi.push({ role: "user", content: selectedTextNode.text });

      switch (apiType) {
        case "gemini": {
          if (!selectedModel) return ["Error: Gemini model not selected for expansion."];
          if (!activeConfig.endpoint_url) return ["Error: Gemini endpoint URL not configured for expansion."];
          apiUrl = `${activeConfig.endpoint_url}/models/${selectedModel}:generateContent`;
          if (apiKey) apiUrl += `?key=${apiKey}`;
          else return ["Error: Gemini API key not configured for expansion."];

          // For Gemini, combine system and user prompts into one text part
          let geminiPromptContent = "";
          if (messagesForApi.length > 0 && messagesForApi[0].role === "system") {
            geminiPromptContent = messagesForApi[0].content;
            if (messagesForApi.length > 1 && messagesForApi[1].role === "user") {
              geminiPromptContent += "\n\n" + messagesForApi[1].content;
            }
          } else if (messagesForApi.length > 0 && messagesForApi[0].role === "user") {
            geminiPromptContent = messagesForApi[0].content;
          } else {
            // Fallback, though messagesForApi should always have system and user here
            geminiPromptContent = selectedTextNode.text;
          }
          requestBody = {
            contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
            // Optional: Add generationConfig if needed, e.g., temperature, maxOutputTokens
            // generationConfig: {
            //   temperature: 0.7,
            //   maxOutputTokens: 256,
            // }
          };
          // No Authorization header for Gemini with API key in URL
          break;
        }

        case "responses": {
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/responses`
            : import.meta.env.LR_API_BASE_URL! + "/responses";
          if (apiKey) requestHeaders["Authorization"] = `Bearer ${apiKey}`;

          // Concatenate system and user prompts for the 'input' field
          let responsesInputContent = "";
          if (messagesForApi.length > 0 && messagesForApi[0].role === "system") {
            responsesInputContent = messagesForApi[0].content;
            if (messagesForApi.length > 1 && messagesForApi[1].role === "user") {
              responsesInputContent += "\n\n" + messagesForApi[1].content;
            }
          } else if (messagesForApi.length > 0 && messagesForApi[0].role === "user") {
            responsesInputContent = messagesForApi[0].content;
          } else {
            responsesInputContent = selectedTextNode.text;
          }
          requestBody = {
            model: selectedModel,
            tools: [], // Assuming no tools for expansion
            input: responsesInputContent,
          };
          console.log("Expansion - 'responses' type request body:", requestBody);
          await Dialog.show({
            title: "提示",
            content: "当前 'responses' API 类型用于文本扩展的功能尚未完全验证，可能无法按预期工作。",
          });
          // Decide if you want to proceed or throw an error like in summary
          // For now, let's proceed but expect potential issues or adapt parsing later
          // throw new Error("暂时不能使用responses格式进行文本扩展，我还没搞明白");
          break;
        }

        case "chat":
        default:
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/chat/completions`
            : import.meta.env.LR_API_BASE_URL! + "/chat/completions";
          if (apiKey) {
            requestHeaders["Authorization"] = `Bearer ${apiKey}`;
          }
          requestBody = {
            model: selectedModel,
            messages: messagesForApi.map((m) => ({ role: m.role || "user", content: m.content })), // Ensure role is present
            // Optional: Add other parameters like temperature, max_tokens
            // temperature: 0.7,
            // max_tokens: 150,
          };
          break;
      }

      console.log(`Expansion (${apiType}) - Final request body:`, JSON.stringify(requestBody, null, 2));
      console.log(`Expansion (${apiType}) - API URL:`, apiUrl);
      console.log(`Expansion (${apiType}) - Request Headers:`, requestHeaders);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        });

        try {
          rawResponseText = await response.clone().text();
          console.log(response.clone().text());
        } catch (textError) {
          console.warn(`Could not get raw text from ${apiType} expansion response:`, textError);
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

        const responseData = await response.json();

        let content = "";
        switch (apiType) {
          case "gemini":
            if (
              responseData &&
              responseData.candidates &&
              responseData.candidates.length > 0 &&
              responseData.candidates[0].content &&
              responseData.candidates[0].content.parts &&
              responseData.candidates[0].content.parts.length > 0 &&
              responseData.candidates[0].content.parts[0].text
            ) {
              content = responseData.candidates[0].content.parts[0].text;
            } else {
              console.error(
                `Unexpected Gemini response structure for expansion:`,
                responseData,
                "Raw:",
                rawResponseText,
              );
              return ["Error: Unexpected Gemini response structure for expansion"];
            }
            break;

          case "responses":
            // The 'responses' API type structure needs to be confirmed.
            // Assuming it might be similar to 'chat' or have a specific field.
            // This is a placeholder, adjust based on actual API response for 'responses' type.
            if (responseData && responseData.output) {
              // Example: if responseData.output contains the text
              content = responseData.output;
            } else if (
              responseData &&
              responseData.choices &&
              responseData.choices.length > 0 &&
              responseData.choices[0].message &&
              responseData.choices[0].message.content
            ) {
              // Fallback to chat-like structure if applicable
              content = responseData.choices[0].message.content;
            } else {
              console.error(
                `Unexpected 'responses' API response structure for expansion:`,
                responseData,
                "Raw:",
                rawResponseText,
              );
              await Dialog.show({
                title: "错误",
                content: "无法解析来自 'responses' API 的扩展结果。请检查控制台日志。",
              });
              return ["Error: Unexpected 'responses' API response structure for expansion"];
            }
            break;

          case "chat":
          default:
            if (
              responseData &&
              responseData.choices &&
              responseData.choices.length > 0 &&
              responseData.choices[0].message &&
              responseData.choices[0].message.content
            ) {
              content = responseData.choices[0].message.content;
            } else {
              console.error(
                "Unexpected chat completions response structure (Expansion):",
                responseData,
                "Raw:",
                rawResponseText,
              );
              return ["Error: Unexpected chat completions response structure"];
            }
            break;
        }
        return content.split("\n").filter((line: string) => line.trim() !== "");
      } catch (e: any) {
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
      console.error("Error loading AI settings or processing API response (Expansion):", e);
      return [`Error: Failed to generate text - ${e.message || "Unknown error"}`];
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

      const messages: { role?: string; content: string; type?: string }[] = [];
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
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/responses`
            : import.meta.env.LR_API_BASE_URL! + "/responses";
          // requestHeaders["Content-Type"] = `application/json`; // Already set
          if (apiKey) requestHeaders["Authorization"] = `Bearer ${apiKey}`;
          requestBody = {
            model: selectedModel,
            tools: [],
            input: (messages[0]?.content || "") + (messages[1]?.content || ""), // ensure content exists
          };
          console.log(requestBody);
          await Dialog.show({ title: "提示", content: "暂时不能使用resonses格式，我还没搞明白" });
          throw new Error("暂时不能使用resonses格式，我还没搞明白");
        // break; // Unreachable due to throw

        case "chat":
        default:
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/chat/completions`
            : import.meta.env.LR_API_BASE_URL! + "/chat/completions";
          if (apiKey) requestHeaders["Authorization"] = `Bearer ${apiKey}`;
          // messages[1].type = "input_text"; // This seems specific and might not be needed generally or for all chat APIs
          requestBody = {
            model: selectedModel,
            messages: messages.map((m) => ({ role: m.role || "user", content: m.content })),
          };
          break;
      }

      console.log("Summary - API Type:", apiType);
      console.log("Summary - Final request body:", JSON.stringify(requestBody, null, 2));
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
              responseData.candidates[0].content.parts.length > 0 &&
              responseData.candidates[0].content.parts[0].text
            ) {
              return responseData.candidates[0].content.parts[0].text;
            } else {
              console.error("Unexpected Gemini response structure for summary:", responseData, "Raw:", rawResponseText);
              return "Error: Unexpected Gemini response structure for summary";
            }
          case "chat":
          default: // Also handles "responses" if it falls through, though it throws above.
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
                `Unexpected ${apiType} API response structure for summary:`, // Made apiType dynamic here
                responseData,
                "Raw:",
                rawResponseText,
              );
              return `Error: Unexpected ${apiType} API response structure for summary`;
            }
        }
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
      console.error("Error loading AI settings or processing summary API response:", e);
      return `Error: Failed to generate summary - ${e.message || "Unknown error"}`;
    }
  }
}
