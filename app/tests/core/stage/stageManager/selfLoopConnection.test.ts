import { describe, it, expect, beforeEach } from "vitest";
import { StageManager } from "../../../../src/core/stage/stageManager/StageManager";
import { TextNode } from "../../../../src/core/stage/stageObject/entity/TextNode";
import { ConnectPoint } from "../../../../src/core/stage/stageObject/entity/ConnectPoint";
import { v4 as uuidv4 } from "uuid";

describe("Self-Loop Connection Tests", () => {
  beforeEach(() => {
    // 清理舞台
    StageManager.destroy();
    // 直接设置 isAllowAddCycleEdge 为 false（默认值）
    (StageManager as any).isAllowAddCycleEdge = false;
  });

  describe("TextNode Self-Loop Connection", () => {
    it("should prevent self-loop when allowAddCycleEdge is false", () => {
      // 创建一个文本节点
      const textNode = new TextNode({
        uuid: uuidv4(),
        text: "Test Node",
        details: "",
        location: [100, 100],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      StageManager.addTextNode(textNode);

      // 尝试连接节点到自身，应该失败
      const result = StageManager.connectEntity(textNode, textNode);
      expect(result).toBe(false);

      // 验证没有创建边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(0);
    });

    it("should allow self-loop when allowAddCycleEdge is true", () => {
      // 启用自环设置
      (StageManager as any).isAllowAddCycleEdge = true;

      // 创建一个文本节点
      const textNode = new TextNode({
        uuid: uuidv4(),
        text: "Test Node",
        details: "",
        location: [100, 100],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      StageManager.addTextNode(textNode);

      // 尝试连接节点到自身，应该成功
      const result = StageManager.connectEntity(textNode, textNode);
      expect(result).toBe(true);

      // 验证创建了边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe(textNode);
      expect(edges[0].target).toBe(textNode);
    });
  });

  describe("ConnectPoint Self-Loop Connection", () => {
    it("should prevent ConnectPoint self-loop when allowAddCycleEdge is false", () => {
      // 创建一个连接点
      const connectPoint = new ConnectPoint({
        uuid: uuidv4(),
        location: [100, 100],
        details: "",
      });

      StageManager.addConnectPoint(connectPoint);

      // 尝试连接连接点到自身，应该失败
      const result = StageManager.connectEntity(connectPoint, connectPoint);
      expect(result).toBe(false);

      // 验证没有创建边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(0);
    });

    it("should allow ConnectPoint self-loop when allowAddCycleEdge is true", () => {
      // 启用自环设置
      (StageManager as any).isAllowAddCycleEdge = true;

      // 创建一个连接点
      const connectPoint = new ConnectPoint({
        uuid: uuidv4(),
        location: [100, 100],
        details: "",
      });

      StageManager.addConnectPoint(connectPoint);

      // 尝试连接连接点到自身，应该成功
      const result = StageManager.connectEntity(connectPoint, connectPoint);
      expect(result).toBe(true);

      // 验证创建了边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe(connectPoint);
      expect(edges[0].target).toBe(connectPoint);
    });
  });

  describe("Multiple Entity Self-Loop Connection", () => {
    it("should handle multiple entities with self-loop setting enabled", () => {
      // 启用自环设置
      (StageManager as any).isAllowAddCycleEdge = true;

      // 创建多个节点
      const textNode = new TextNode({
        uuid: uuidv4(),
        text: "Text Node",
        details: "",
        location: [100, 100],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      const connectPoint = new ConnectPoint({
        uuid: uuidv4(),
        location: [200, 200],
        details: "",
      });

      StageManager.addTextNode(textNode);
      StageManager.addConnectPoint(connectPoint);

      // 连接文本节点到自身
      const result1 = StageManager.connectEntity(textNode, textNode);
      expect(result1).toBe(true);

      // 连接连接点到自身
      const result2 = StageManager.connectEntity(connectPoint, connectPoint);
      expect(result2).toBe(true);

      // 验证创建了两条边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(2);

      // 验证边的连接关系
      const textNodeEdge = edges.find((edge) => edge.source === textNode && edge.target === textNode);
      const connectPointEdge = edges.find((edge) => edge.source === connectPoint && edge.target === connectPoint);

      expect(textNodeEdge).toBeDefined();
      expect(connectPointEdge).toBeDefined();
    });
  });

  describe("Multiple Connection with Self-Loop", () => {
    it("should handle connectMultipleEntities with self-loop correctly", () => {
      // 启用自环设置
      (StageManager as any).isAllowAddCycleEdge = true;

      // 创建节点
      const node1 = new TextNode({
        uuid: uuidv4(),
        text: "Node 1",
        details: "",
        location: [100, 100],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      const node2 = new TextNode({
        uuid: uuidv4(),
        text: "Node 2",
        details: "",
        location: [200, 200],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      StageManager.addTextNode(node1);
      StageManager.addTextNode(node2);

      // 使用 connectMultipleEntities 连接多个节点，包括自环
      const result = StageManager.connectMultipleEntities([node1, node2], node1);
      expect(result).toBe(true);

      // 验证创建了边
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(2);

      // 验证有一条自环边和一条普通边
      const selfLoopEdge = edges.find((edge) => edge.source === node1 && edge.target === node1);
      const normalEdge = edges.find((edge) => edge.source === node2 && edge.target === node1);

      expect(selfLoopEdge).toBeDefined();
      expect(normalEdge).toBeDefined();
    });

    it("should skip self-loop in connectMultipleEntities when allowAddCycleEdge is false", () => {
      // 保持默认设置（allowAddCycleEdge = false）

      // 创建节点
      const node1 = new TextNode({
        uuid: uuidv4(),
        text: "Node 1",
        details: "",
        location: [100, 100],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      const node2 = new TextNode({
        uuid: uuidv4(),
        text: "Node 2",
        details: "",
        location: [200, 200],
        size: [100, 50],
        color: [255, 255, 255, 1],
      });

      StageManager.addTextNode(node1);
      StageManager.addTextNode(node2);

      // 使用 connectMultipleEntities 连接多个节点，自环应该被跳过
      const result = StageManager.connectMultipleEntities([node1, node2], node1);
      expect(result).toBe(true);

      // 验证只创建了一条边（跳过了自环）
      const edges = StageManager.getLineEdges();
      expect(edges.length).toBe(1);

      // 验证只有普通边，没有自环边
      const normalEdge = edges.find((edge) => edge.source === node2 && edge.target === node1);
      const selfLoopEdge = edges.find((edge) => edge.source === node1 && edge.target === node1);

      expect(normalEdge).toBeDefined();
      expect(selfLoopEdge).toBeUndefined();
    });
  });
});
