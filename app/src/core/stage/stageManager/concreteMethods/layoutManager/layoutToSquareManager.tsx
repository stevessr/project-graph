import { Rectangle } from "../../../../dataStruct/shape/Rectangle";
import { Vector } from "../../../../dataStruct/Vector";
import { StageHistoryManager } from "../../StageHistoryManager";
import { StageEntityMoveManager } from "../StageEntityMoveManager";
import { Stage } from "../../../Stage";
import { Entity } from "../../../stageObject/abstract/Entity";

export namespace LayoutToSquareManager {
  /**
   * 将所有选中的节点尽可能摆放排列成正方形
   */
  export function layoutToSquare() {
    const nodes = Array.from(Stage.stageManager.getEntities()).filter((node): node is Entity => node.isSelected);
    const n = nodes.length;
    if (n <= 1) return;

    // 计算所有节点的最大宽度和高度
    let maxWidth = 0,
      maxHeight = 0;
    nodes.forEach((node) => {
      const rect = node.collisionBox.getRectangle();
      maxWidth = Math.max(maxWidth, rect.size.x);
      maxHeight = Math.max(maxHeight, rect.size.y);
    });

    const spacing = 20; // 单元格之间的间距
    const cellSize = Math.max(maxWidth, maxHeight) + spacing;

    // 计算最优的行列数，使网格尽可能接近正方形
    const { rows, cols } = getOptimalRowsCols(n);

    // 计算网格的总尺寸
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;

    // 计算原始包围盒的中心点
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach((node) => {
      const rect = node.collisionBox.getRectangle();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 计算网格的起始位置（左上角）
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;

    // 将节点排列到网格中
    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const cellCenterX = startX + col * cellSize + cellSize / 2;
      const cellCenterY = startY + row * cellSize + cellSize / 2;
      const rect = node.collisionBox.getRectangle();
      const newX = cellCenterX - rect.size.x / 2;
      const newY = cellCenterY - rect.size.y / 2;
      StageEntityMoveManager.moveEntityToUtils(node, new Vector(newX, newY));
    });
    StageHistoryManager.recordStep();
  }

  /**
   * 将所有选中的节点摆放排列成整齐的矩形，尽可能采取空间紧凑的布局，减少空间浪费
   * 尽可能接近美观的矩形比例，不出现极端的长方形
   * 有待优化
   */
  export function layoutToTightSquare() {
    const entities = Array.from(Stage.stageManager.getEntities()).filter((entity): entity is Entity => entity.isSelected);
    if (entities.length === 0) return;

    // 获取所有实体的包围盒并建立布局信息
    const layoutItems = entities.map((entity) => ({
      entity,
      rect: entity.collisionBox.getRectangle().clone(),
    }));

    // 按面积降序排序（优先放置大元素）
    layoutItems.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);

    // 初始化布局参数
    const spacing = 5; // 最小间距

    // 核心布局算法 - 替换为更高效的贪心行填充算法
    let currentX = 0;
    let currentY = 0;
    let currentRowHeight = 0;
    let currentLayoutWidth = 0;

    // 计算目标行宽，基于最优列数和单元格尺寸
    const n = entities.length;
    const { cols } = getOptimalRowsCols(n);
    // 计算所有节点的最大宽度和高度
    let maxWidth = 0,
      maxHeight = 0;
    entities.forEach((entity) => {
      const rect = entity.collisionBox.getRectangle();
      maxWidth = Math.max(maxWidth, rect.size.x);
      maxHeight = Math.max(maxHeight, rect.size.y);
    });
    const cellSize = Math.max(maxWidth, maxHeight) + spacing;
    const targetRowWidth = cols * cellSize;


    layoutItems.forEach((item) => {
      const currentRect = item.rect;

      // 如果当前行放不下，则换行
      if (currentX + currentRect.width + spacing > targetRowWidth && currentX > 0) {
        currentX = 0;
        currentY += currentRowHeight + spacing;
        currentRowHeight = 0;
      }

      // 放置当前矩形
      currentRect.location = new Vector(currentX, currentY);

      // 更新当前行信息和总布局宽度
      currentX += currentRect.width + spacing;
      currentRowHeight = Math.max(currentRowHeight, currentRect.height);
      currentLayoutWidth = Math.max(currentLayoutWidth, currentX);
    });

    // 最终布局高度
    const currentLayoutHeight = currentY + currentRowHeight;

    // 平衡宽高比（最大1.5:1）

    // 平衡宽高比（最大1.5:1）

    // 计算原始包围盒中心
    const originalBounds = Rectangle.getBoundingRectangle(entities.map((e) => e.collisionBox.getRectangle()));
    const originalCenter = originalBounds.center;

    // 计算布局中心偏移量
    const offset = originalCenter.subtract(new Vector(currentLayoutWidth / 2, currentLayoutHeight / 2));

    // 应用布局位置
    layoutItems.forEach((item) => {
      const targetPos = item.rect.location.add(offset);
      StageEntityMoveManager.moveEntityToUtils(item.entity, targetPos);
    });

    StageHistoryManager.recordStep();
  }
}

// 辅助函数：计算最优的行列数，使网格尽可能接近正方形
function getOptimalRowsCols(n: number): { rows: number; cols: number } {
  let bestRows = Math.floor(Math.sqrt(n));
  let bestCols = Math.ceil(n / bestRows);
  let bestDiff = Math.abs(bestRows - bestCols);

  // 遍历可能的行数，寻找行列差最小的情况
  for (let rows = bestRows; rows >= 1; rows--) {
    const cols = Math.ceil(n / rows);
    const diff = Math.abs(rows - cols);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRows = rows;
      bestCols = cols;
    }
  }

  return { rows: bestRows, cols: bestCols };
}
