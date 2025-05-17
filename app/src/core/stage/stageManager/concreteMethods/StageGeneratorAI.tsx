// src/core/stage/stageManager/concreteMethods/StageGeneratorAI.tsx
import { TextNode } from "../../stageObject/entity/TextNode"; // Path might need adjustment
import { StageManager } from "../StageManager"; // Path might need adjustment
import { AiApiHandler } from "../../../ai/aiApiHandler"; // Path to new AI handler
import { StageNodeFactory } from "./stageNodeFactory"; // Path to new node factory
// Removed unused imports like AiSettings, ArrayFunctions, Vector, EdgeRenderer, Stage, uuidv4, invoke, fetch

export namespace StageGeneratorAI {
  /**
   * 扩展所有选中的节点
   * 工具栏按钮的触发函数
   */
  export async function generateNewTextNodeBySelected() {
    const selectedTextNodes = StageManager.getSelectedEntities().filter(
      (entity): entity is TextNode => entity instanceof TextNode,
    );
    if (selectedTextNodes.length === 0) {
      return;
    }

    for (const selectedTextNode of selectedTextNodes) {
      selectedTextNode.isAiGenerating = true;
      try {
        const expandArrayList = await AiApiHandler.fetchTextListForExpansion(selectedTextNode);
        // Check if the first element starts with "Error:" as per AiApiHandler's error reporting
        if (expandArrayList.length > 0 && expandArrayList[0].startsWith("Error:")) {
          console.error("AI Expansion Error:", expandArrayList[0]);
          // Optionally: Display error to user, e.g., using a notification system
          // Stage.effectMachine.addEffect(new TextRiseEffect(expandArrayList[0]));
        } else {
          StageNodeFactory.createChildNodes(selectedTextNode, expandArrayList);
        }
      } catch (error) {
        console.error("Error during AI expansion process:", error);
        // Optionally: Display generic error to user
      } finally {
        selectedTextNode.isAiGenerating = false;
      }
    }
  }

  /**
   * 为所有选中的节点生成摘要
   * 工具栏按钮的触发函数
   */
  export async function generateSummaryBySelected() {
    const selectedTextNodes = StageManager.getSelectedEntities().filter(
      (entity): entity is TextNode => entity instanceof TextNode,
    );
    if (selectedTextNodes.length === 0) {
      return;
    }

    selectedTextNodes.forEach((node) => (node.isAiGenerating = true));

    try {
      const summaryText = await AiApiHandler.fetchSummaryForNodes(selectedTextNodes);

      if (!summaryText.startsWith("Error:")) {
        StageNodeFactory.createSummaryNode(selectedTextNodes, summaryText);
      } else {
        console.error("AI Summary Generation Error:", summaryText);
        // Optionally: Display error to user
        // Stage.effectMachine.addEffect(new TextRiseEffect(summaryText));
      }
    } catch (error) {
      console.error("Error during grouped summary generation:", error);
      // Optionally: Display generic error to user
    } finally {
      selectedTextNodes.forEach((node) => (node.isAiGenerating = false));
    }
  }
}
