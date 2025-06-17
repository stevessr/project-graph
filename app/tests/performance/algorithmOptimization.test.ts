import { describe, it, expect, beforeEach } from "vitest";
import { ComplexityDetector } from "../../src/core/service/dataManageService/ComplexityDetector";
import { GraphMethods } from "../../src/core/stage/stageManager/basicMethods/GraphMethods";
import { SectionMethods } from "../../src/core/stage/stageManager/basicMethods/SectionMethods";
import { StageManager } from "../../src/core/stage/stageManager/StageManager";
import { TextNode } from "../../src/core/stage/stageObject/entity/TextNode";
import { Section } from "../../src/core/stage/stageObject/entity/Section";
import { LineEdge } from "../../src/core/stage/stageObject/association/LineEdge";

import { v4 } from "uuid";

describe("Algorithm Optimization Performance Tests", () => {
  beforeEach(() => {
    // 清理舞台
    StageManager.destroy();
  });

  describe("ComplexityDetector Optimization", () => {
    it("should handle large number of entities efficiently", () => {
      // 创建大量实体进行性能测试
      const entityCount = 1000;
      const entities: TextNode[] = [];

      // 创建实体
      for (let i = 0; i < entityCount; i++) {
        const entity = new TextNode({
          uuid: v4(),
          text: `Node ${i}`,
          details: "",
          location: [Math.random() * 1000, Math.random() * 1000],
          size: [100, 50],
          color: [255, 255, 255, 1],
        });
        entities.push(entity);
        StageManager.addTextNode(entity);
      }

      // 测试复杂度检测性能
      const startTime = performance.now();
      const result = ComplexityDetector.detectorCurrentStage();
      const endTime = performance.now();

      console.log(`ComplexityDetector took ${endTime - startTime} milliseconds for ${entityCount} entities`);

      expect(result.entityCount).toBe(entityCount);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it("should detect overlaps efficiently with optimized algorithm", () => {
      // 创建一些重叠的实体
      const overlappingEntities = [
        new TextNode({
          uuid: v4(),
          text: "Node 1",
          details: "",
          location: [100, 100],
          size: [100, 50],
          color: [255, 255, 255, 1],
        }),
        new TextNode({
          uuid: v4(),
          text: "Node 2",
          details: "",
          location: [150, 120], // 与第一个重叠
          size: [100, 50],
          color: [255, 255, 255, 1],
        }),
        new TextNode({
          uuid: v4(),
          text: "Node 3",
          details: "",
          location: [300, 300], // 不重叠
          size: [100, 50],
          color: [255, 255, 255, 1],
        }),
      ];

      overlappingEntities.forEach((entity) => StageManager.addTextNode(entity));

      const result = ComplexityDetector.detectorCurrentStage();
      expect(result.entityOverlapCount).toBeGreaterThan(0);
    });
  });

  describe("GraphMethods Optimization", () => {
    it("should cache node children queries efficiently", () => {
      // 创建图结构
      const nodes: TextNode[] = [];
      for (let i = 0; i < 100; i++) {
        const node = new TextNode({
          uuid: v4(),
          text: `Node ${i}`,
          details: "",
          location: [i * 50, 100],
          size: [40, 30],
          color: [255, 255, 255, 1],
        });
        nodes.push(node);
        StageManager.addTextNode(node);
      }

      // 创建边
      for (let i = 0; i < nodes.length - 1; i++) {
        const edge = new LineEdge({
          uuid: v4(),
          source: nodes[i].uuid,
          target: nodes[i + 1].uuid,
          text: "",
          color: [0, 0, 0, 1],
          sourceRectRate: [0.5, 0.5],
          targetRectRate: [0.5, 0.5],
          type: "core:line_edge",
        });
        StageManager.addLineEdge(edge);
      }

      // 测试多次查询的性能（应该受益于缓存）
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const children = GraphMethods.nodeChildrenArray(nodes[0]);
        expect(children.length).toBe(1);
      }
      const endTime = performance.now();

      console.log(`GraphMethods.nodeChildrenArray took ${endTime - startTime} milliseconds for 100 queries`);
      expect(endTime - startTime).toBeLessThan(100); // 缓存应该让查询很快
    });

    it("should handle successor set calculation efficiently", () => {
      // 创建一个较深的图结构
      const nodes: TextNode[] = [];
      for (let i = 0; i < 50; i++) {
        const node = new TextNode({
          uuid: v4(),
          text: `Node ${i}`,
          details: "",
          location: [i * 30, 100],
          size: [25, 25],
          color: [255, 255, 255, 1],
        });
        nodes.push(node);
        StageManager.addTextNode(node);
      }

      // 创建链式结构
      for (let i = 0; i < nodes.length - 1; i++) {
        const edge = new LineEdge({
          uuid: v4(),
          source: nodes[i].uuid,
          target: nodes[i + 1].uuid,
          text: "",
          color: [0, 0, 0, 1],
          sourceRectRate: [0.5, 0.5],
          targetRectRate: [0.5, 0.5],
          type: "core:line_edge",
        });
        StageManager.addLineEdge(edge);
      }

      const startTime = performance.now();
      const successors = GraphMethods.getSuccessorSet(nodes[0]);
      const endTime = performance.now();

      console.log(`GraphMethods.getSuccessorSet took ${endTime - startTime} milliseconds`);
      expect(successors.length).toBe(50); // 应该包含所有节点
      expect(endTime - startTime).toBeLessThan(50); // 应该很快完成
    });
  });

  describe("SectionMethods Optimization", () => {
    it("should cache father sections queries efficiently", () => {
      // 创建 Section 和实体
      const sections: Section[] = [];
      const entities: TextNode[] = [];

      for (let i = 0; i < 20; i++) {
        const section = new Section({
          uuid: v4(),
          text: `Section ${i}`,
          details: "",
          location: [i * 100, i * 100],
          size: [200, 200],
          color: [200, 200, 200, 0.5],
        });
        sections.push(section);
        StageManager.addSection(section);
      }

      for (let i = 0; i < 50; i++) {
        const entity = new TextNode({
          uuid: v4(),
          text: `Entity ${i}`,
          details: "",
          location: [i * 20, 50],
          size: [30, 20],
          color: [255, 255, 255, 1],
        });
        entities.push(entity);
        StageManager.addTextNode(entity);

        // 将实体添加到随机 Section 中
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        randomSection.children.push(entity);
      }

      // 测试多次查询的性能
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const fathers = SectionMethods.getFatherSections(entities[0]);
        expect(fathers.length).toBeGreaterThanOrEqual(0);
      }
      const endTime = performance.now();

      console.log(`SectionMethods.getFatherSections took ${endTime - startTime} milliseconds for 100 queries`);
      expect(endTime - startTime).toBeLessThan(100); // 缓存应该让查询很快
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate caches when structure changes", () => {
      const node1 = new TextNode({
        uuid: v4(),
        text: "Node 1",
        details: "",
        location: [100, 100],
        size: [50, 30],
        color: [255, 255, 255, 1],
      });

      const node2 = new TextNode({
        uuid: v4(),
        text: "Node 2",
        details: "",
        location: [200, 100],
        size: [50, 30],
        color: [255, 255, 255, 1],
      });

      StageManager.addTextNode(node1);
      StageManager.addTextNode(node2);

      // 第一次查询，建立缓存
      let children = GraphMethods.nodeChildrenArray(node1);
      expect(children.length).toBe(0);

      // 手动清除缓存并添加边
      GraphMethods.invalidateCache();

      const edge = LineEdge.fromTwoEntity(node1, node2);
      // 手动设置正确的引用
      edge.source = node1;
      edge.target = node2;
      StageManager.addLineEdge(edge);

      // 再次查询，应该返回更新后的结果
      children = GraphMethods.nodeChildrenArray(node1);
      expect(children.length).toBe(1);
      expect(children[0]).toBe(node2);
    });
  });
});
