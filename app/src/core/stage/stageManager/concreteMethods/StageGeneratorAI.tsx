import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";
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
  interface PromptNode {
    text: string;
    node_type?: string | null;
    params?: any | null;
    children?: PromptNode[] | null;
  }

  interface AiSettings {
    api_endpoint: string | null;
    api_key: string | null;
    selected_model: string | null;
    custom_prompts: PromptNode[] | null; // Updated type
    api_type: string | null;
    summary_prompt?: string | null; // Add field for custom summary prompt
  }

  async function realGenerateTextList(selectedTextNode: TextNode) {
    try {
      const aiSettings: AiSettings = await invoke("load_ai_settings");
      const openaiApiEndpoint = aiSettings.api_endpoint;
      const apiKey = aiSettings.api_key;
      const selectedModel = aiSettings.selected_model;
      const apiType = aiSettings.api_type; // Get api_type

      let apiUrl: string;
      let body: any;
      let responseData: any;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`; // Add Authorization header
      }

      if (apiType === "chat") {
        // Chat Completions API
        apiUrl = openaiApiEndpoint
          ? `${openaiApiEndpoint}/chat/completions` // Use user specified /chat/completions endpoint
          : import.meta.env.LR_API_BASE_URL! + "/ai/chat-completions"; // Fallback to default chat completions URL

        // Build messages based on structured prompts
        const messages: { role: string; content: string }[] = [];

        if (aiSettings.custom_prompts && aiSettings.custom_prompts.length > 0) {
          aiSettings.custom_prompts.forEach((node) => {
            // Each 'node' represents a line from the input format
            let messageContent = node.text; // Start with the parent text

            // Append children text if they exist
            if (node.children && node.children.length > 0) {
              const childrenString = node.children.map((child) => child.text).join(", "); // Join children with comma
              messageContent += `: ${childrenString}`; // Combine with parent using colon
            }

            // Add the combined content as a single system message
            if (messageContent.trim()) {
              messages.push({ role: "system", content: messageContent });
            }
            // Note: node_type and params from the PromptNode structure are currently ignored
            // in this line-based format's message construction.
          });
        }

        // Add the current node's text as the final user message
        messages.push({
          role: "user",
          content: selectedTextNode.text,
        });
        body = {
          model: selectedModel, // Add model field
          messages: messages, // Use the constructed messages array
        };

        // Old logic removed:
        // // Add system prompt if available
        // if (aiSettings.custom_prompts) {
        //   body.messages.unshift({
        //     role: "system",
        //     content: aiSettings.custom_prompts, // This was incorrect for structured prompts
        //   });
        // }

        try {
          responseData = await (
            await fetch(apiUrl, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(body),
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
      } else {
        // Default to Responses API (or if apiType is "responses")
        apiUrl = openaiApiEndpoint
          ? `${openaiApiEndpoint}/responses` // Use user specified /responses endpoint
          : import.meta.env.LR_API_BASE_URL! + "/ai/extend-word"; // Fallback to default responses URL

        body = {
          input: selectedTextNode.text, // Use input field
        };

        // Add model field if available
        if (selectedModel) {
          body.model = selectedModel;
        }

        try {
          responseData = await (
            await fetch(apiUrl, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(body),
            })
          ).json();

          // Assuming responses API returns { words: string[] }
          if (responseData && Array.isArray(responseData.words)) {
            return responseData.words.map(String); // Ensure models are strings
          } else {
            console.error("Unexpected responses API response structure:", responseData);
            return ["Error: Unexpected responses API response structure"];
          }
        } catch (e) {
          console.error("Responses API error:", e);
          return ["Error: Responses API error"];
        }
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
      const openaiApiEndpoint = aiSettings.api_endpoint;
      const apiKey = aiSettings.api_key;
      const selectedModel = aiSettings.selected_model;
      const apiType = aiSettings.api_type;

      let apiUrl: string;
      let body: any;
      let responseData: any;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Primarily use chat API for summarization
      if (apiType === "chat") {
        apiUrl = openaiApiEndpoint
          ? `${openaiApiEndpoint}/chat/completions`
          : import.meta.env.LR_API_BASE_URL! + "/ai/chat-completions";

        const messages: { role: string; content: string }[] = [];

        // Add custom prompts if they exist (could be context or instructions)
        if (aiSettings.custom_prompts && aiSettings.custom_prompts.length > 0) {
          aiSettings.custom_prompts.forEach((node) => {
            let messageContent = node.text;
            if (node.children && node.children.length > 0) {
              const childrenString = node.children.map((child) => child.text).join(", ");
              messageContent += `: ${childrenString}`;
            }
            if (messageContent.trim()) {
              messages.push({ role: "system", content: messageContent });
            }
          });
        }

        // Determine the summary prompt to use
        const summaryPrompt = aiSettings.summary_prompt?.trim()
          ? aiSettings.summary_prompt
          : "用简洁的语言概括以下内容："; // Default prompt

        // Add the determined instruction for summarization
        messages.push({ role: "system", content: summaryPrompt });

        // --- Construct detailed user message content ---
        let userMessageContent = "以下是选中的节点及其内容：\n";
        const selectedNodeUUIDs = selectedTextNodes.map((node) => node.uuid); // Added parentheses

        selectedTextNodes.forEach((node) => {
          // Added parentheses and newline/indent
          userMessageContent += `- ${node.uuid}: ${node.text}\n`;
        });

        userMessageContent += "\n以下是这些节点之间的连接关系：\n";
        let connectionsFound = false;
        StageManager.getLineEdges().forEach((edge) => {
          // Added parentheses and newline/indent
          const sourceSelected = selectedNodeUUIDs.includes(edge.source.uuid);
          const targetSelected = selectedNodeUUIDs.includes(edge.target.uuid);

          // Only include connections *between* selected nodes
          if (sourceSelected && targetSelected) {
            userMessageContent += `- ${edge.source.uuid} -> ${edge.target.uuid}\n`;
            connectionsFound = true;
          }
        });

        if (!connectionsFound) {
          userMessageContent += "(选中的节点之间没有连接关系)\n";
        }

        userMessageContent += "\n请根据以上节点内容和它们之间的连接关系进行总结。";
        // --- End of detailed user message content construction ---
        // Add the constructed user message
        messages.push({
          role: "user",
          content: userMessageContent,
        });

        body = {
          model: selectedModel,
          messages: messages,
        };

        try {
          responseData = await (
            await fetch(apiUrl, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(body),
            })
          ).json();

          if (
            responseData &&
            responseData.choices &&
            responseData.choices.length > 0 &&
            responseData.choices[0].message &&
            responseData.choices[0].message.content
          ) {
            return responseData.choices[0].message.content; // Return the summary string
          } else {
            console.error("Unexpected chat completions response structure for summary:", responseData);
            return "Error: Unexpected chat completions response structure";
          }
        } catch (e) {
          console.error("Chat completions API error during summary:", e);
          return "Error: Chat completions API error";
        }
      } else {
        // Fallback or alternative API logic for summarization if needed
        // For now, return an error if not using chat API, as 'responses' endpoint is for word extension
        console.warn("Summarization currently only supported via 'chat' API type.");
        return "Error: Summarization requires 'chat' API type in settings";
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
