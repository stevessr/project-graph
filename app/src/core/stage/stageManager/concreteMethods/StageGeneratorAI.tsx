import { invoke, fetch } from "../../../../utils/tauriApi";
import { v4 as uuidv4 } from "uuid";
import { AiSettings } from "../../../../types/aiSettings"; // Added import
import { ArrayFunctions } from "../../../algorithm/arrayFunctions";
import { Vector } from "../../../dataStruct/Vector";
import { EdgeRenderer } from "../../../render/canvas2d/entityRenderer/edge/EdgeRenderer";
import { Stage } from "../../Stage";
import { TextNode } from "../../stageObject/entity/TextNode";
import { StageManager } from "../StageManager";

export namespace StageGeneratorAI {
  /**
   * 扩展所有选中的节点
   * 工具栏按钮的触发函数
   */
  export async function generateNewTextNodeBySelected() {
    const selectedTextNodes = StageManager.getSelectedEntities().filter((entity) => entity instanceof TextNode);
    if (selectedTextNodes.length === 0) {
      return;
    }

    // 遍历所有选中节点
    for (const selectedTextNode of selectedTextNodes) {
      selectedTextNode.isAiGenerating = true;
      const expandArrayList = await realGenerateTextList(selectedTextNode);
      selectedTextNode.isAiGenerating = false;
      generateChildNodes(selectedTextNode, expandArrayList);
    }
  }

  /**
   * 为所有选中的节点生成摘要
   * 工具栏按钮的触发函数
   */
  export async function generateSummaryBySelected() {
    const selectedTextNodes = StageManager.getSelectedEntities().filter(
      (entity): entity is TextNode => entity instanceof TextNode, // Type guard for filtering
    );
    if (selectedTextNodes.length === 0) {
      return;
    }

    // Set generating flag for all selected nodes
    selectedTextNodes.forEach((node) => (node.isAiGenerating = true));

    try {
      // Call summary function once with all selected nodes
      const summaryText = await realGenerateSummary(selectedTextNodes);

      if (!summaryText.startsWith("Error:")) {
        // Call node generation function once with all parents
        generateSummaryNode(selectedTextNodes, summaryText);
      } else {
        // Handle error display if needed
        console.error("AI Summary Generation Error:", summaryText);
        // Consider showing a single error message for the group operation
        // Stage.effectMachine.addEffect(new TextRiseEffect(summaryText));
      }
    } catch (error) {
      console.error("Error during grouped summary generation:", error);
      // Handle potential errors during the async operations
    } finally {
      // Unset generating flag for all selected nodes
      selectedTextNodes.forEach((node) => (node.isAiGenerating = false));
    }
  }

  // Re-define PromptNode here to avoid potential circular dependencies
  // or manage imports carefully if defined centrally.
  // Removed PromptNode, PromptCollection and PromptVersion interfaces as they are not used here or imported

  // Removed old AiSettings interface

  async function realGenerateTextList(selectedTextNode: TextNode) {
    try {
      const aiSettings: AiSettings = await invoke("load_ai_settings");
      console.log("aiSettings", aiSettings);

      const activeConfig = aiSettings.api_configs.find((config) => config.id === aiSettings.active_config_id);

      if (!activeConfig) {
        console.error("No active API configuration found.");
        return ["Error: No active API configuration found."];
      }

      const apiKey = activeConfig.api_key;
      const selectedModel = activeConfig.default_model;

      const apiUrl: string = activeConfig.endpoint_url
        ? `${activeConfig.endpoint_url}/chat/completions` // Use user specified /chat/completions endpoint
        : import.meta.env.LR_API_BASE_URL! + "/chat/completions"; // Fallback to default chat completions URL;
      // let body: any; // Removed unused variable
      let responseData: any;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`; // Add Authorization header
      }

      // Build messages based on structured prompts
      const messages: { role: string; content: string }[] = [];

      let systemMessageContent = aiSettings?.custom_prompts;
      //console.log("aiSettings:", aiSettings);

      if (systemMessageContent) {
        messages.push({ role: "system", content: systemMessageContent });
      } else {
        console.warn("No selected system prompt found or loaded. Using default system prompt.");
        // Add a default system prompt if none is selected
        systemMessageContent = "neko,一个联想家，请根据提供的词汇联想词汇，一行一个,仅仅输出联想即可"; // Default system prompt
        messages.push({ role: "system", content: systemMessageContent });
      }

      // Add the current node's text as the final user message
      messages.push({
        role: "user",
        content: selectedTextNode.text,
      });
      const finalBody = {
        model: selectedModel, // Add model field
        messages: messages, // Use the constructed messages array
      };

      console.log("Final request body:", finalBody);
      console.log("API URL:", apiUrl);
      try {
        // Make the API call
        responseData = await (
          await fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(finalBody),
          })
        ).json();

        // Assuming chat completions response structure has choices[0].message.content
        // We need to extract the generated text and return it as an array of strings
        if (
          responseData &&
          responseData.choices &&
          responseData.choices.length > 0 &&
          responseData.choices[0].message
        ) {
          // Split the response content by newline characters to create a child node for each line.
          const content = responseData.choices[0].message.content;
          return content.split("\n").filter((line: string) => line.trim() !== ""); // Split by newline and remove empty lines
        } else {
          console.error("Unexpected chat completions response structure:", responseData);
          return ["Error: Unexpected chat completions response structure"];
        }
      } catch (e) {
        console.error("Chat completions API error:", e);
        return ["Error: Chat completions API error"];
      }
    } catch (e) {
      console.error("Error loading AI settings or processing API response:", e);
      return ["Error: Failed to generate text"];
    }
  }

  // Modified to accept an array of nodes
  async function realGenerateSummary(selectedTextNodes: TextNode[]): Promise<string> {
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
      let responseData: any;
      let rawResponseText = ""; // For debugging

      // --- Construct messages array for chat/gemini ---
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
      // --- End of messages construction ---

      switch (apiType) {
        case "gemini":
          if (!selectedModel) {
            console.error("Gemini API requires a model to be selected for summary.");
            return "Error: Gemini model not selected for summary.";
          }
          if (!activeConfig.endpoint_url) {
            console.error("Gemini API requires an endpoint URL for summary.");
            return "Error: Gemini endpoint URL not configured for summary.";
          }
          apiUrl = `${activeConfig.endpoint_url}/models/${selectedModel}:generateContent`;
          if (apiKey) {
            apiUrl += `?key=${apiKey}`;
          } else {
            console.error("Gemini API requires an API key for summary.");
            return "Error: Gemini API key not configured for summary.";
          }
          {
            // Added block scope for lexical declaration
            let geminiPromptContent = "";
            if (messages.length > 0 && messages[0].role === "system") {
              geminiPromptContent = messages[0].content; // System prompt
              if (messages.length > 1 && messages[1].role === "user") {
                geminiPromptContent += "\n\n" + messages[1].content; // User prompt
              }
            } else if (messages.length > 0 && messages[0].role === "user") {
              geminiPromptContent = messages[0].content;
            } else {
              geminiPromptContent = userMessageContent; // Fallback to constructed user message
            }
            requestBody = {
              contents: [{ role: "user", parts: [{ text: geminiPromptContent }] }],
            };
          }
          break;

        case "responses":
          // 'responses' API type is generally not suitable for summarization as designed.
          // Returning an error or specific message.
          console.warn("Summarization is not supported for 'responses' API type.");
          return "Error: Summarization not supported for 'responses' API type.";

        case "chat":
        default:
          apiUrl = activeConfig.endpoint_url
            ? `${activeConfig.endpoint_url}/chat/completions`
            : import.meta.env.LR_API_BASE_URL! + "/chat/completions"; // Fallback
          if (apiKey) {
            requestHeaders["Authorization"] = `Bearer ${apiKey}`;
          }
          requestBody = {
            model: selectedModel,
            messages: messages,
          };
          break;
      }

      console.log("API Type (Summary):", apiType);
      console.log("Final request body (Summary):", requestBody);
      console.log("API URL (Summary):", apiUrl);
      console.log("Request Headers (Summary):", requestHeaders);

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

        responseData = await response.json();

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
          // 'responses' case handled above, will not reach here.
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

  function generateChildNodes(parent: TextNode, childTextList: string[]) {
    if (childTextList.length === 0) {
      return;
    }

    // 计算旋转角度
    const diffRotateDegrees = childTextList.length === 1 ? 0 : 90 / (childTextList.length - 1);
    let startRotateDegrees = -(90 / 2);

    const toParentDegrees: number[] = [];
    for (const edge of StageManager.getLineEdges()) {
      if (edge.target === parent) {
        toParentDegrees.push(
          edge.target.collisionBox
            .getRectangle()
            .center.subtract(edge.source.collisionBox.getRectangle().center)
            .toDegrees(),
        );
      }
    }

    if (toParentDegrees.length === 1) {
      startRotateDegrees += toParentDegrees[0];
    } else if (toParentDegrees.length > 1) {
      // 求平均值
      const avgToParentDegrees = ArrayFunctions.average(toParentDegrees);

      startRotateDegrees += avgToParentDegrees;
    }

    // 遍历扩展
    for (let i = 0; i < childTextList.length; i++) {
      const newText = childTextList[i];
      const newUUID = uuidv4();
      const newNode = new TextNode({
        uuid: newUUID,
        text: newText,
        details: "",
        location: [parent.collisionBox.getRectangle().location.x, parent.collisionBox.getRectangle().location.y],
        size: [100, 100],
      });
      // moveAroundNode(newNode, parent);
      // 先让新节点和父节点中心点对齐
      newNode.moveTo(
        parent.collisionBox
          .getRectangle()
          .center.subtract(
            new Vector(newNode.collisionBox.getRectangle().size.x / 2, newNode.collisionBox.getRectangle().size.y / 2),
          ),
      );

      // 再旋转
      newNode.move(
        Vector.fromDegrees(startRotateDegrees)
          .rotateDegrees(diffRotateDegrees * i)
          .multiply(500),
      );
      while (isNodeOverlapWithOther(newNode)) {
        newNode.move(
          Vector.fromDegrees(startRotateDegrees)
            .rotateDegrees(diffRotateDegrees * i)
            .multiply(100),
        );
      }

      StageManager.addTextNode(newNode);
      // 连线
      StageManager.connectEntity(parent, newNode);
      // 特效
      Stage.effectMachine.addEffects(EdgeRenderer.getConnectedEffects(parent, newNode));
    }
  }
}

// Moved function definition earlier to resolve TS error
function isNodeOverlapWithOther(node: TextNode): boolean {
  const rect = node.collisionBox.getRectangle();
  for (const otherNode of StageManager.getTextNodes()) {
    if (node.uuid === otherNode.uuid) {
      continue;
    }
    if (otherNode.collisionBox.isIntersectsWithRectangle(rect)) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a single summary node and connects it to all parent nodes.
 */
// Modified to accept an array of parent nodes
function generateSummaryNode(parents: TextNode[], summaryText: string) {
  if (!summaryText || parents.length === 0) {
    return;
  }

  // Calculate center of all parent nodes
  let totalX = 0;
  // let totalY = 0; // Removed unused variable
  let totalWidth = 0; // Use average width for the new node size?
  parents.forEach((p) => {
    const rect = p.collisionBox.getRectangle();
    totalX += rect.center.x;
    // totalY += rect.center.y;
    totalWidth += rect.size.x;
  });
  const centerX = totalX / parents.length;
  // const centerY = totalY / parents.length; // Removed unused variable
  const avgWidth = totalWidth / parents.length;
  const avgParentBottom = parents.reduce((maxBottom, p) => {
    const rect = p.collisionBox.getRectangle();
    return Math.max(maxBottom, rect.location.y + rect.size.y);
  }, -Infinity);

  const newUUID = uuidv4();
  const newNode = new TextNode({
    uuid: newUUID,
    text: `Summary: ${summaryText}`, // Prefix summary text
    details: "",
    // Position below the center of the parents
    location: [centerX - avgWidth / 2, avgParentBottom + 50], // Position below the lowest parent + spacing
    size: [Math.max(avgWidth, 150), 50], // Use average width, with a minimum
    color: [100, 100, 200, 0.8], // Optional: Give summary nodes a distinct color
  });

  // Adjust size based on text content (optional, requires text measurement)
  // newNode.forceAdjustSizeByText(); // Uncomment if auto-sizing is desired and implemented correctly

  // Ensure the new node doesn't overlap significantly
  let attempts = 0;
  const maxAttempts = 10;
  const moveVector = new Vector(0, 50); // Use const, move down further if overlap occurs
  while (isNodeOverlapWithOther(newNode) && attempts < maxAttempts) {
    newNode.move(moveVector);
    attempts++;
  }

  StageManager.addTextNode(newNode);

  // Connect all parents to the new summary node
  parents.forEach((parent) => {
    StageManager.connectEntity(parent, newNode);
    // Add connection effect for each parent
    Stage.effectMachine.addEffects(EdgeRenderer.getConnectedEffects(parent, newNode));
  });
}
