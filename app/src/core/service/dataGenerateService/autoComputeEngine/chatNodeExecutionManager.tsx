import { ConnectableEntity } from "../../../stage/stageObject/abstract/ConnectableEntity";
import { TextNode } from "../../../stage/stageObject/entity/TextNode";
import { StageManager } from "../../../stage/stageManager/StageManager";
import { LogicNodeNameEnum } from "./logicNodeNameEnum";

/**
 * 聊天节点执行状态管理器
 * 确保同一时间只有一个聊天节点在执行，并且树状依赖正确
 */
export namespace ChatNodeExecutionManager {
  // 当前正在执行的聊天节点UUID集合
  const executingChatNodes = new Set<string>();

  // 已完成执行的聊天节点UUID集合
  const completedChatNodes = new Set<string>();

  // 节点执行状态
  export enum ExecutionStatus {
    IDLE = "idle",
    EXECUTING = "executing",
    COMPLETED = "completed",
    ERROR = "error",
  }

  // 节点执行状态映射
  const nodeExecutionStatus = new Map<string, ExecutionStatus>();

  /**
   * 检查节点是否可以执行
   * @param node 要检查的节点
   * @returns 是否可以执行
   */
  export function canExecute(node: TextNode): boolean {
    // 如果节点已经在执行中，不能重复执行
    if (executingChatNodes.has(node.uuid)) {
      return false;
    }

    // 如果节点已经完成执行，不能重复执行
    if (completedChatNodes.has(node.uuid)) {
      return false;
    }

    // 检查是否有其他聊天节点正在执行
    if (executingChatNodes.size > 0) {
      return false;
    }

    // 检查父节点是否都已完成执行
    const parentNodes = getParentChatNodes(node);
    for (const parentNode of parentNodes) {
      if (isChatNode(parentNode) && !completedChatNodes.has(parentNode.uuid)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 开始执行节点
   * @param node 要执行的节点
   */
  export function startExecution(node: TextNode): void {
    if (!canExecute(node)) {
      throw new Error(`Node ${node.uuid} cannot be executed at this time`);
    }

    executingChatNodes.add(node.uuid);
    nodeExecutionStatus.set(node.uuid, ExecutionStatus.EXECUTING);

    // 设置节点的视觉状态
    node.isAiGenerating = true;
  }

  /**
   * 完成节点执行
   * @param node 完成执行的节点
   */
  export function completeExecution(node: TextNode): void {
    executingChatNodes.delete(node.uuid);
    completedChatNodes.add(node.uuid);
    nodeExecutionStatus.set(node.uuid, ExecutionStatus.COMPLETED);

    // 清除节点的视觉状态
    node.isAiGenerating = false;
  }

  /**
   * 执行失败
   * @param node 执行失败的节点
   */
  export function failExecution(node: TextNode): void {
    executingChatNodes.delete(node.uuid);
    nodeExecutionStatus.set(node.uuid, ExecutionStatus.ERROR);

    // 清除节点的视觉状态
    node.isAiGenerating = false;
  }

  /**
   * 重置节点执行状态
   * @param node 要重置的节点
   */
  export function resetExecution(node: TextNode): void {
    executingChatNodes.delete(node.uuid);
    completedChatNodes.delete(node.uuid);
    nodeExecutionStatus.set(node.uuid, ExecutionStatus.IDLE);

    // 清除节点的视觉状态
    node.isAiGenerating = false;
  }

  /**
   * 重置所有节点的执行状态
   */
  export function resetAllExecutions(): void {
    executingChatNodes.clear();
    completedChatNodes.clear();
    nodeExecutionStatus.clear();

    // 清除所有节点的视觉状态
    const allTextNodes = StageManager.getTextNodes();
    for (const node of allTextNodes) {
      if (isChatNode(node)) {
        node.isAiGenerating = false;
      }
    }
  }

  /**
   * 获取节点的执行状态
   * @param node 节点
   * @returns 执行状态
   */
  export function getExecutionStatus(node: TextNode): ExecutionStatus {
    return nodeExecutionStatus.get(node.uuid) || ExecutionStatus.IDLE;
  }

  /**
   * 检查是否有节点正在执行
   * @returns 是否有节点正在执行
   */
  export function hasExecutingNodes(): boolean {
    return executingChatNodes.size > 0;
  }

  /**
   * 获取当前正在执行的节点
   * @returns 正在执行的节点数组
   */
  export function getExecutingNodes(): TextNode[] {
    const result: TextNode[] = [];
    const allTextNodes = StageManager.getTextNodes();

    for (const node of allTextNodes) {
      if (executingChatNodes.has(node.uuid)) {
        result.push(node);
      }
    }

    return result;
  }

  /**
   * 获取节点的父聊天节点
   * @param node 节点
   * @returns 父聊天节点数组
   */
  function getParentChatNodes(node: TextNode): TextNode[] {
    const parentNodes: TextNode[] = [];
    const allEdges = StageManager.getLineEdges();

    for (const edge of allEdges) {
      if (edge.target.uuid === node.uuid && edge.source instanceof TextNode) {
        if (isChatNode(edge.source)) {
          parentNodes.push(edge.source);
        }
      }
    }

    return parentNodes;
  }

  /**
   * 检查节点是否是聊天节点
   * @param node 节点
   * @returns 是否是聊天节点
   */
  function isChatNode(node: ConnectableEntity): boolean {
    if (!(node instanceof TextNode)) {
      return false;
    }

    return node.text === LogicNodeNameEnum.CHAT_CONTENT || node.text === LogicNodeNameEnum.CHAT_SYSTEM_CONTENT;
  }
}
