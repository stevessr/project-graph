// src/core/stage/stageManager/concreteMethods/stageNodeFactory.ts
import { v4 as uuidv4 } from "uuid";
import { ArrayFunctions } from "../../../algorithm/arrayFunctions"; // Path might need adjustment
import { Vector } from "../../../dataStruct/Vector"; // Path might need adjustment
import { EdgeRenderer } from "../../../render/canvas2d/entityRenderer/edge/EdgeRenderer"; // Path might need adjustment
import { Stage } from "../../Stage"; // Path might need adjustment
import { TextNode } from "../../stageObject/entity/TextNode"; // Path might need adjustment
import { StageManager } from "../StageManager"; // Path might need adjustment

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

export namespace StageNodeFactory {
  export function createChildNodes(parent: TextNode, childTextList: string[]): void {
    if (childTextList.length === 0) {
      return;
    }

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
      const avgToParentDegrees = ArrayFunctions.average(toParentDegrees);
      startRotateDegrees += avgToParentDegrees;
    }

    for (let i = 0; i < childTextList.length; i++) {
      const newText = childTextList[i];
      const newUUID = uuidv4();
      const newNode = new TextNode({
        uuid: newUUID,
        text: newText,
        details: "",
        location: [parent.collisionBox.getRectangle().location.x, parent.collisionBox.getRectangle().location.y],
        size: [100, 100], // Default size, can be adjusted
      });

      newNode.moveTo(
        parent.collisionBox
          .getRectangle()
          .center.subtract(
            new Vector(newNode.collisionBox.getRectangle().size.x / 2, newNode.collisionBox.getRectangle().size.y / 2),
          ),
      );

      newNode.move(
        Vector.fromDegrees(startRotateDegrees)
          .rotateDegrees(diffRotateDegrees * i)
          .multiply(500), // Initial distance
      );

      while (isNodeOverlapWithOther(newNode)) {
        newNode.move(
          Vector.fromDegrees(startRotateDegrees)
            .rotateDegrees(diffRotateDegrees * i)
            .multiply(100), // Move further if overlap
        );
      }

      StageManager.addTextNode(newNode);
      StageManager.connectEntity(parent, newNode);
      Stage.effectMachine.addEffects(EdgeRenderer.getConnectedEffects(parent, newNode));
    }
  }

  export function createSummaryNode(parents: TextNode[], summaryText: string): void {
    if (!summaryText || parents.length === 0) {
      return;
    }

    let totalX = 0;
    let totalWidth = 0;
    parents.forEach((p) => {
      const rect = p.collisionBox.getRectangle();
      totalX += rect.center.x;
      totalWidth += rect.size.x;
    });
    const centerX = totalX / parents.length;
    const avgWidth = totalWidth / parents.length;
    const avgParentBottom = parents.reduce((maxBottom, p) => {
      const rect = p.collisionBox.getRectangle();
      return Math.max(maxBottom, rect.location.y + rect.size.y);
    }, -Infinity);

    const newUUID = uuidv4();
    const newNode = new TextNode({
      uuid: newUUID,
      text: `Summary: ${summaryText}`,
      details: "",
      location: [centerX - avgWidth / 2, avgParentBottom + 50],
      size: [Math.max(avgWidth, 150), 50],
      color: [100, 100, 200, 0.8], // Distinct color for summary nodes
    });

    // Optional: Adjust size based on text content
    // newNode.forceAdjustSizeByText();

    let attempts = 0;
    const maxAttempts = 10;
    const moveVector = new Vector(0, 50);
    while (isNodeOverlapWithOther(newNode) && attempts < maxAttempts) {
      newNode.move(moveVector);
      attempts++;
    }

    StageManager.addTextNode(newNode);

    parents.forEach((parent) => {
      StageManager.connectEntity(parent, newNode);
      Stage.effectMachine.addEffects(EdgeRenderer.getConnectedEffects(parent, newNode));
    });
  }
}
