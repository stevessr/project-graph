import { ConnectableEntity } from "../../stageObject/abstract/ConnectableEntity";
import { Edge } from "../../stageObject/association/Edge";
import { StageManager } from "../StageManager";

/**
 * 图方法的缓存管理器，用于优化频繁的图遍历操作
 */
class GraphCache {
  private static instance: GraphCache;
  private edgeCache: Map<string, ConnectableEntity[]> = new Map();
  private reverseEdgeCache: Map<string, ConnectableEntity[]> = new Map();
  private edgeDict: Record<string, string> | null = null;
  private reverseEdgeDict: Record<string, string> | null = null;
  private lastUpdateTime = 0;
  private cacheValidityDuration = 100; // 缓存有效期100ms

  static getInstance(): GraphCache {
    if (!GraphCache.instance) {
      GraphCache.instance = new GraphCache();
    }
    return GraphCache.instance;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastUpdateTime < this.cacheValidityDuration;
  }

  /**
   * 清除所有缓存
   */
  invalidateCache(): void {
    this.edgeCache.clear();
    this.reverseEdgeCache.clear();
    this.edgeDict = null;
    this.reverseEdgeDict = null;
    this.lastUpdateTime = 0;
  }

  /**
   * 获取节点的子节点（带缓存）
   */
  getNodeChildren(node: ConnectableEntity): ConnectableEntity[] {
    if (!this.isCacheValid()) {
      this.invalidateCache();
    }

    const cacheKey = node.uuid;
    if (this.edgeCache.has(cacheKey)) {
      return this.edgeCache.get(cacheKey)!;
    }

    const children: ConnectableEntity[] = [];
    for (const edge of StageManager.getLineEdges()) {
      if (edge.source.uuid === node.uuid) {
        children.push(edge.target);
      }
    }

    this.edgeCache.set(cacheKey, children);
    this.lastUpdateTime = Date.now();
    return children;
  }

  /**
   * 获取节点的父节点（带缓存）
   */
  getNodeParents(node: ConnectableEntity): ConnectableEntity[] {
    if (!this.isCacheValid()) {
      this.invalidateCache();
    }

    const cacheKey = node.uuid;
    if (this.reverseEdgeCache.has(cacheKey)) {
      return this.reverseEdgeCache.get(cacheKey)!;
    }

    const parents: ConnectableEntity[] = [];
    for (const edge of StageManager.getLineEdges()) {
      if (edge.target.uuid === node.uuid && edge.target.uuid !== edge.source.uuid) {
        parents.push(edge.source);
      }
    }

    this.reverseEdgeCache.set(cacheKey, parents);
    this.lastUpdateTime = Date.now();
    return parents;
  }

  /**
   * 获取反向边字典（带缓存）
   */
  getReversedEdgeDict(): Record<string, string> {
    if (!this.isCacheValid() || !this.reverseEdgeDict) {
      this.reverseEdgeDict = {};
      for (const edge of StageManager.getLineEdges()) {
        this.reverseEdgeDict[edge.target.uuid] = edge.source.uuid;
      }
      this.lastUpdateTime = Date.now();
    }
    return this.reverseEdgeDict;
  }
}

export namespace GraphMethods {
  const cache = GraphCache.getInstance();

  /**
   * 清除图方法缓存（在图结构发生变化时调用）
   */
  export function invalidateCache(): void {
    cache.invalidateCache();
  }

  export function isTree(node: ConnectableEntity): boolean {
    const dfs = (node: ConnectableEntity, visited: Set<string>): boolean => {
      if (visited.has(node.uuid)) {
        return false;
      }
      visited.add(node.uuid);
      for (const child of nodeChildrenArray(node)) {
        if (!dfs(child, visited)) {
          return false;
        }
      }
      return true;
    };

    return dfs(node, new Set());
  }

  /** 获取节点连接的子节点数组，未排除自环 - 优化版本使用缓存 */
  export function nodeChildrenArray(node: ConnectableEntity): ConnectableEntity[] {
    return cache.getNodeChildren(node);
  }

  /**
   * 获取一个节点的所有父亲节点，排除自环 - 优化版本使用缓存
   */
  export function nodeParentArray(node: ConnectableEntity): ConnectableEntity[] {
    return cache.getNodeParents(node);
  }

  /**
   * 获取反向边集 - 优化版本使用缓存
   */
  function getReversedEdgeDict(): Record<string, string> {
    return cache.getReversedEdgeDict();
  }

  /**
   * 获取自己的祖宗节点
   * @param node 节点
   */
  export function getRoots(node: ConnectableEntity): ConnectableEntity[] {
    const reverseEdges = getReversedEdgeDict();
    let rootUUID = node.uuid;
    const visited: Set<string> = new Set(); // 用于记录已经访问过的节点，避免重复访问
    while (reverseEdges[rootUUID] && !visited.has(rootUUID)) {
      visited.add(rootUUID);
      const parentUUID = reverseEdges[rootUUID];
      const parent = StageManager.getConnectableEntityByUUID(parentUUID);
      if (parent) {
        rootUUID = parentUUID;
      } else {
        break;
      }
    }
    const root = StageManager.getConnectableEntityByUUID(rootUUID);
    if (root) {
      return [root];
    } else {
      return [];
    }
  }

  export function isConnected(node: ConnectableEntity, target: ConnectableEntity): boolean {
    for (const edge of StageManager.getLineEdges()) {
      if (edge.source === node && edge.target === target) {
        return true;
      }
    }
    return false;
  }

  /**
   * 通过一个节点获取一个 可达节点集合/后继节点集合 Successor Set
   * 包括它自己
   * @param node
   */
  export function getSuccessorSet(node: ConnectableEntity, isHaveSelf: boolean = true): ConnectableEntity[] {
    let result: ConnectableEntity[] = []; // 存储可达节点的结果集
    const visited: Set<string> = new Set(); // 用于记录已经访问过的节点，避免重复访问

    // 深度优先搜索 (DFS) 实现
    const dfs = (currentNode: ConnectableEntity): void => {
      if (visited.has(currentNode.uuid)) {
        return; // 如果节点已经被访问过，直接返回
      }
      visited.add(currentNode.uuid); // 标记当前节点为已访问
      result.push(currentNode); // 将当前节点加入结果集

      // 遍历当前节点的所有子节点
      const children = nodeChildrenArray(currentNode);
      for (const child of children) {
        dfs(child); // 对每个子节点递归调用 DFS
      }
    };

    // 从给定节点开始进行深度优先搜索
    dfs(node);
    if (!isHaveSelf) {
      result = result.filter((n) => n === node);
    }

    return result; // 返回所有可达节点的集合
  }

  /**
   * 获取一个节点的一步可达节点集合/后继节点集合 One-Step Successor Set
   * 排除自环
   * @param node
   */
  export function getOneStepSuccessorSet(node: ConnectableEntity): ConnectableEntity[] {
    const result: ConnectableEntity[] = []; // 存储可达节点的结果集
    for (const edge of StageManager.getLineEdges()) {
      if (edge.source === node && edge.target.uuid !== edge.source.uuid) {
        result.push(edge.target);
      }
    }
    return result;
  }

  export function getEdgesBetween(node1: ConnectableEntity, node2: ConnectableEntity): Edge[] {
    const result: Edge[] = []; // 存储连接两个节点的边的结果集
    for (const edge of StageManager.getEdges()) {
      if (edge.source === node1 && edge.target === node2) {
        result.push(edge);
      }
    }
    return result;
  }

  export function getEdgeFromTwoEntity(fromNode: ConnectableEntity, toNode: ConnectableEntity): Edge | null {
    for (const edge of StageManager.getEdges()) {
      if (edge.source === fromNode && edge.target === toNode) {
        return edge;
      }
    }
    return null;
  }
}
