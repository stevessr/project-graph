import { describe, it, expect, vi, beforeEach } from "vitest";
import { TextNode } from "../../../../../src/core/stage/stageObject/entity/TextNode";
import { NodeLogic } from "../../../../../src/core/service/dataGenerateService/autoComputeEngine/functions/nodeLogic";
import { LogicNodeNameEnum } from "../../../../../src/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";

// Mock the AI API service
vi.mock("../../../../../src/services/aiApiService", () => ({
  callAiApi: vi.fn(),
}));

describe("Chat Nodes", () => {
  let inputNode: TextNode;
  let outputNode: TextNode;
  let systemNode: TextNode;

  beforeEach(() => {
    // Create mock nodes
    inputNode = new TextNode({
      uuid: "input-1",
      text: "Hello, how are you?",
      location: [0, 0],
      size: [100, 50],
    });

    outputNode = new TextNode({
      uuid: "output-1",
      text: "",
      location: [200, 0],
      size: [100, 50],
    });

    systemNode = new TextNode({
      uuid: "system-1",
      text: "You are a helpful assistant.",
      location: [0, -100],
      size: [100, 50],
    });
  });

  describe("chatContent", () => {
    it("should return error when no input nodes provided", () => {
      const result = NodeLogic.chatContent([], [outputNode]);
      expect(result).toEqual(["Error: 需要至少一个输入节点作为内容"]);
    });

    it("should return error when input node is not TextNode", () => {
      const mockNode = { uuid: "mock", text: "test" } as any;
      const result = NodeLogic.chatContent([mockNode], [outputNode]);
      expect(result).toEqual(["Error: 输入节点必须是TextNode"]);
    });

    it("should return error when no output node provided", () => {
      const result = NodeLogic.chatContent([inputNode], []);
      expect(result).toEqual(["Error: 需要连接一个输出节点"]);
    });

    it("should return error when output node is not TextNode", () => {
      const mockNode = { uuid: "mock", text: "test" } as any;
      const result = NodeLogic.chatContent([inputNode], [mockNode]);
      expect(result).toEqual(["Error: 需要连接一个输出节点"]);
    });

    it("should start AI conversation when valid nodes provided", () => {
      const result = NodeLogic.chatContent([inputNode], [outputNode]);
      expect(result).toEqual(["开始AI对话..."]);
    });
  });

  describe("chatSystemContent", () => {
    it("should return error when less than 2 input nodes provided", () => {
      const result = NodeLogic.chatSystemContent([inputNode], [outputNode]);
      expect(result).toEqual(["Error: 需要两个输入节点：系统提示和内容"]);
    });

    it("should return error when input nodes are not TextNode", () => {
      const mockNode = { uuid: "mock", text: "test" } as any;
      const result = NodeLogic.chatSystemContent([mockNode, inputNode], [outputNode]);
      expect(result).toEqual(["Error: 输入节点必须都是TextNode"]);
    });

    it("should return error when no output node provided", () => {
      const result = NodeLogic.chatSystemContent([systemNode, inputNode], []);
      expect(result).toEqual(["Error: 需要连接一个输出节点"]);
    });

    it("should start AI conversation when valid nodes provided", () => {
      const result = NodeLogic.chatSystemContent([systemNode, inputNode], [outputNode]);
      expect(result).toEqual(["开始AI对话..."]);
    });
  });

  describe("Logic Node Enum", () => {
    it("should have chat node types defined", () => {
      expect(LogicNodeNameEnum.CHAT_CONTENT).toBe("#CHAT_CONTENT#");
      expect(LogicNodeNameEnum.CHAT_SYSTEM_CONTENT).toBe("#CHAT_SYSTEM_CONTENT#");
    });
  });

  describe("Chat Node Rate Limiting", () => {
    beforeEach(() => {
      // 重置所有聊天节点执行状态
      NodeLogic.resetAllChatNodeExecutionStates();
    });

    it("should prevent duplicate execution of same chat node", () => {
      // 模拟第一次执行
      const result1 = NodeLogic.chatContent([inputNode], [outputNode]);
      expect(result1).toEqual(["开始AI对话..."]);

      // 立即尝试第二次执行，应该被阻止
      const result2 = NodeLogic.chatContent([inputNode], [outputNode]);
      expect(result2).toEqual(["聊天节点正在执行中，请等待完成..."]);
    });

    it("should check execution status correctly", () => {
      const nodeId = outputNode.uuid;

      // 初始状态应该是未执行
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(false);

      // 开始执行后应该返回true
      NodeLogic.chatContent([inputNode], [outputNode]);
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(true);
    });

    it("should reset all execution states", () => {
      const nodeId = outputNode.uuid;

      // 开始执行
      NodeLogic.chatContent([inputNode], [outputNode]);
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(true);

      // 重置状态
      NodeLogic.resetAllChatNodeExecutionStates();
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(false);
    });

    it("should stop specific node execution", () => {
      const nodeId = outputNode.uuid;

      // 开始执行
      NodeLogic.chatContent([inputNode], [outputNode]);
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(true);

      // 停止特定节点执行
      NodeLogic.stopChatNodeExecution(nodeId);
      expect(NodeLogic.isChatNodeExecuting(nodeId)).toBe(false);
    });

    it("should count executing nodes correctly", () => {
      // 初始应该是0
      expect(NodeLogic.getExecutingChatNodeCount()).toBe(0);

      // 开始执行一个节点
      NodeLogic.chatContent([inputNode], [outputNode]);
      expect(NodeLogic.getExecutingChatNodeCount()).toBe(1);

      // 重置后应该回到0
      NodeLogic.resetAllChatNodeExecutionStates();
      expect(NodeLogic.getExecutingChatNodeCount()).toBe(0);
    });
  });
});
