import { describe, it, expect, beforeEach } from "vitest";
import { StageManager } from "../../src/core/stage/stageManager/StageManager";
import { TextNode } from "../../src/core/stage/stageObject/entity/TextNode";
import { Section } from "../../src/core/stage/stageObject/entity/Section";
import { Rectangle } from "../../src/core/dataStruct/shape/Rectangle";
import { Vector } from "../../src/core/dataStruct/Vector";
import { SectionMethods } from "../../src/core/stage/stageManager/basicMethods/SectionMethods";
import { StageSerializedAdder } from "../../src/core/stage/stageManager/concreteMethods/StageSerializedAdder";
import { Serialized } from "../../src/types/node";
import { v4 } from "uuid";

describe("Advanced Algorithm Optimization Performance Tests", () => {
  beforeEach(() => {
    // 清理舞台
    StageManager.destroy();
  });

  describe("Rendering System Optimization", () => {
    it("should efficiently filter visible entities for rendering", () => {
      // 创建大量实体，其中只有部分在视图内
      const entityCount = 2000;
      const entities: TextNode[] = [];

      // 创建分布在大范围内的实体
      for (let i = 0; i < entityCount; i++) {
        const entity = new TextNode({
          uuid: v4(),
          text: `Node ${i}`,
          details: "",
          location: [Math.random() * 10000 - 5000, Math.random() * 10000 - 5000], // 大范围分布
          size: [50, 30],
          color: [255, 255, 255, 1],
        });
        entities.push(entity);
        StageManager.addTextNode(entity);
      }

      // 模拟一个小的视图矩形
      const viewRectangle = new Rectangle(new Vector(0, 0), new Vector(800, 600));

      // 测试可见实体过滤性能
      const startTime = performance.now();

      // 模拟渲染过程中的可见性检查
      let visibleCount = 0;
      for (const entity of entities) {
        const entityRect = entity.collisionBox.getRectangle();
        if (!isEntityOverView(viewRectangle, entityRect)) {
          visibleCount++;
        }
      }

      const endTime = performance.now();

      console.log(`Visibility filtering for ${entityCount} entities took ${endTime - startTime} milliseconds`);
      console.log(`Found ${visibleCount} visible entities out of ${entityCount}`);

      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
      expect(visibleCount).toBeGreaterThan(0);
      expect(visibleCount).toBeLessThan(entityCount);
    });
  });

  describe("Spatial Index Optimization", () => {
    it("should efficiently find entities at specific locations", () => {
      // 创建网格分布的实体
      const gridSize = 50;
      const entities: TextNode[] = [];

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const entity = new TextNode({
            uuid: v4(),
            text: `Grid ${x},${y}`,
            details: "",
            location: [x * 100, y * 100],
            size: [80, 40],
            color: [255, 255, 255, 1],
          });
          entities.push(entity);
          StageManager.addTextNode(entity);
        }
      }

      // 测试位置查找性能
      const testLocations = [
        new Vector(150, 150),
        new Vector(2500, 2500),
        new Vector(4900, 4900),
        new Vector(10, 10),
        new Vector(5000, 5000), // 可能没有实体的位置
      ];

      const startTime = performance.now();

      let foundCount = 0;
      for (const location of testLocations) {
        if (StageManager.isEntityOnLocation(location)) {
          foundCount++;
        }
      }

      const endTime = performance.now();

      console.log(`Location queries for ${testLocations.length} points took ${endTime - startTime} milliseconds`);
      console.log(`Found entities at ${foundCount} locations`);

      expect(endTime - startTime).toBeLessThan(20); // 应该很快完成
      expect(foundCount).toBeGreaterThan(0);
    });
  });

  describe("Section Hierarchy Optimization", () => {
    it("should efficiently compute section hierarchies", () => {
      // 创建嵌套的 Section 结构
      const sections: Section[] = [];
      const entities: TextNode[] = [];

      // 创建多层嵌套的 Section
      for (let level = 0; level < 5; level++) {
        for (let i = 0; i < 10; i++) {
          const section = new Section({
            uuid: v4(),
            text: `Section L${level}-${i}`,
            details: "",
            location: [level * 200 + i * 50, level * 200 + i * 50],
            size: [400 - level * 50, 400 - level * 50],
            color: [200, 200, 200, 0.3],
          });
          sections.push(section);
          StageManager.addSection(section);
        }
      }

      // 创建一些实体
      for (let i = 0; i < 100; i++) {
        const entity = new TextNode({
          uuid: v4(),
          text: `Entity ${i}`,
          details: "",
          location: [Math.random() * 800, Math.random() * 800],
          size: [40, 25],
          color: [255, 255, 255, 1],
        });
        entities.push(entity);
        StageManager.addTextNode(entity);
      }

      // 测试层级查找性能
      const startTime = performance.now();

      let totalSections = 0;
      for (const entity of entities.slice(0, 20)) {
        // 测试前20个实体
        const fatherSections = SectionMethods.getFatherSectionsList(entity);
        totalSections += fatherSections.length;
      }

      const endTime = performance.now();

      console.log(`Section hierarchy queries took ${endTime - startTime} milliseconds`);
      console.log(`Found ${totalSections} total section relationships`);

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe("Serialization Optimization", () => {
    it("should efficiently handle large data serialization", () => {
      // 创建大量数据用于序列化测试
      const entityCount = 500;
      const edgeCount = 200;

      const serializedData: Serialized.File = {
        entities: [],
        associations: [],
        camera: { location: [0, 0], scale: 1 },
        stage: { background: [255, 255, 255, 1] },
      };

      // 创建实体数据
      for (let i = 0; i < entityCount; i++) {
        serializedData.entities.push({
          uuid: v4(),
          type: "core:text_node",
          text: `Serialized Node ${i}`,
          details: `Details for node ${i}`,
          location: [Math.random() * 1000, Math.random() * 1000],
          size: [100, 50],
          color: [255, 255, 255, 1],
        } as Serialized.TextNode);
      }

      // 创建边数据
      for (let i = 0; i < edgeCount; i++) {
        const sourceIndex = Math.floor(Math.random() * entityCount);
        const targetIndex = Math.floor(Math.random() * entityCount);

        serializedData.associations.push({
          uuid: v4(),
          type: "core:line_edge",
          source: serializedData.entities[sourceIndex].uuid,
          target: serializedData.entities[targetIndex].uuid,
          text: "",
          color: [0, 0, 0, 1],
          sourceRectRate: [0.5, 0.5],
          targetRectRate: [0.5, 0.5],
        } as Serialized.LineEdge);
      }

      // 测试序列化添加性能
      const startTime = performance.now();

      StageSerializedAdder.addSerializedData(serializedData);

      const endTime = performance.now();

      console.log(
        `Serialization of ${entityCount} entities and ${edgeCount} edges took ${endTime - startTime} milliseconds`,
      );

      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
      expect(StageManager.getEntities().length).toBe(entityCount);
      expect(StageManager.getLineEdges().length).toBe(edgeCount);
    });
  });

  describe("Collision Detection Optimization", () => {
    it("should efficiently handle collision detection with many entities", () => {
      // 创建密集分布的实体
      const gridSize = 30;
      const entities: TextNode[] = [];

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const entity = new TextNode({
            uuid: v4(),
            text: `C${x},${y}`,
            details: "",
            location: [x * 60, y * 60], // 密集分布，可能有重叠
            size: [70, 35], // 稍大的尺寸，增加重叠可能性
            color: [255, 255, 255, 1],
          });
          entities.push(entity);
          StageManager.addTextNode(entity);
        }
      }

      // 模拟碰撞检测过程
      const startTime = performance.now();

      let collisionCount = 0;
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const rect1 = entities[i].collisionBox.getRectangle();
          const rect2 = entities[j].collisionBox.getRectangle();

          if (rect1.isCollideWith(rect2)) {
            collisionCount++;
          }
        }
      }

      const endTime = performance.now();

      console.log(`Collision detection for ${entities.length} entities took ${endTime - startTime} milliseconds`);
      console.log(`Found ${collisionCount} collisions`);

      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});

// 辅助函数
function isEntityOverView(viewRectangle: Rectangle, entityRect: Rectangle): boolean {
  return (
    entityRect.right < viewRectangle.left ||
    entityRect.left > viewRectangle.right ||
    entityRect.bottom < viewRectangle.top ||
    entityRect.top > viewRectangle.bottom
  );
}
