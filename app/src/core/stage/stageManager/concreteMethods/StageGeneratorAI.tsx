import { fetch } from "@tauri-apps/plugin-http"; // Removed RequestOptions type import
import { v4 as uuidv4 } from "uuid";
import { Settings } from "../../../service/Settings"; // Import Settings service
import { ArrayFunctions } from "../../../algorithm/arrayFunctions";
import { Dialog } from "../../../../components/dialog"; // Import Dialog component
import { Vector } from "../../../dataStruct/Vector";
import { EdgeRenderer } from "../../../render/canvas2d/entityRenderer/edge/EdgeRenderer";
import { TextRiseEffect } from "../../../service/feedbackService/effectEngine/concrete/TextRiseEffect";
import { Stage } from "../../Stage";
import { TextNode } from "../../stageObject/entity/TextNode";
import { StageManager } from "../StageManager";

export namespace StageGeneratorAI {
  /**
   * 扩展所有选中的节点
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

  async function realGenerateTextList(selectedTextNode: TextNode) {
    try {
      // Get API URL and Key from Settings
      const apiUrl = await Settings.get("aiApiUrl");
      const apiKey = await Settings.get("aiApiKey");
      const modelName = await Settings.get("aiModelName"); // Get model name from Settings

      // Prepare fetch options - Removed explicit RequestOptions type
      const requestOptions = {
        method: "POST",
        // Define headers with an index signature to allow adding Authorization later
        headers: {
          "Content-Type": "application/json",
        } as { [key: string]: string }, // Add index signature type assertion
        body: JSON.stringify({
          model: modelName, // Continue using the model name from Settings
          messages: [
            {
              role: "system",
              content:
                "你是一个创意助手，请根据用户提供的词语，扩展出 5 个相关的词语或短语，每个占一行，不要包含任何额外的解释或编号。",
            }, // System message defines the task
            { role: "user", content: selectedTextNode.text }, // User message contains the selected word
          ],
          // Optional: Add other parameters like temperature, max_tokens, etc.
        }),
      };

      // Add Authorization header if API key exists
      if (apiKey && apiKey.trim() !== "") {
        // Assuming Bearer token authentication, adjust if needed
        requestOptions.headers!["Authorization"] = `Bearer ${apiKey}`;
      }

      // Construct the full endpoint URL
      const endpointUrl = `${apiUrl}/v1/chat/completions`; // Use the standard Chat Completions endpoint

      const response = await fetch(endpointUrl, requestOptions);

      if (!response.ok) {
        // Handle non-2xx responses
        let errorText = await response.text(); // Default to getting text
        try {
          const errorJson = JSON.parse(errorText); // Attempt to parse JSON
          if (errorJson.error && errorJson.error.message) {
            errorText = errorJson.error.message; // Use OpenAI's error message
          }
        } catch (e) {
          console.error("Failed to parse error response as JSON:", e);
        }
        console.error(`AI API Error (${response.status}): ${errorText}`);
        const errorMessage = `AI 请求失败: ${response.status}. ${errorText}`;
        Stage.effectMachine.addEffect(new TextRiseEffect(errorMessage));
        Dialog.show({ title: "AI 错误", content: errorMessage }); // Show dialog on API error
        return ["error"];
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const content = data.choices[0].message.content || "";
        const words = content
          .split("\n")
          .map((word: string) => word.trim())
          .filter((word: string) => word.length > 0); // Split, trim, and filter empty lines

        const tokens = data.usage?.total_tokens || 0; // Attempt to get token usage
        Stage.effectMachine.addEffect(new TextRiseEffect(`生成完成，消耗 ${tokens} Tokens`));
        return words;
      } else {
        // Handle unexpected response format
        console.error("AI API Response format unexpected:", data);
        const errorMessage = "AI 响应格式错误";
        Stage.effectMachine.addEffect(new TextRiseEffect(errorMessage));
        Dialog.show({ title: "AI 错误", content: errorMessage });
        return ["error"];
      }
    } catch (e) {
      console.error(e);
      const errorMessage = `AI 请求时发生错误: ${e instanceof Error ? e.message : String(e)}`;
      Stage.effectMachine.addEffect(new TextRiseEffect(errorMessage)); // Keep or remove this effect based on preference
      Dialog.show({ title: "AI 错误", content: errorMessage }); // Show dialog on general error
      return ["error"];
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
}
