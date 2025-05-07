import { Vector } from "../../../../dataStruct/Vector";
import { StageEntityMoveManager } from "../StageEntityMoveManager";
import { Stage } from "../../../Stage";
import { StageHistoryManager } from "../../StageHistoryManager";
import { Entity } from "../../../stageObject/abstract/Entity";

/**
 * 关于框嵌套结构的自动布局工具
 */
export namespace LayoutSectionManager {
  /**
   * 默认化布局所有选中的内容
   */
  export function defaultLayout() {
    const entities = Array.from(Stage.stageManager.getEntities()).filter(
      (node): node is Entity => node.isSelected,
    ) as Entity[];
    if (entities.length <= 1) return;

    // Sort entities by their x-coordinate
    entities.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);

    let currentX = 0;
    const currentY = 0; // Keep Y constant for horizontal layout
    const spacing = 20; // Spacing between entities

    for (const entity of entities) {
      const rect = entity.collisionBox.getRectangle();
      const newPosition = new Vector(currentX, currentY);
      StageEntityMoveManager.moveEntityToUtils(entity, newPosition);

      currentX += rect.size.x + spacing;
    }

    StageHistoryManager.recordStep();
  }
}
