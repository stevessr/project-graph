import { Vector } from "../../../../dataStruct/Vector";

/**
 * 节点创建限速管理器
 * 用于防止短时间内重复创建节点，解决双击事件重复触发等问题
 */
export class NodeCreationRateLimiter {
  private lastCreationTime = 0;
  private lastCreationLocation = Vector.getZero();
  private readonly cooldownTime: number;
  private readonly distanceThreshold: number;
  private readonly name: string;

  constructor(name: string, cooldownTime = 300, distanceThreshold = 50) {
    this.name = name;
    this.cooldownTime = cooldownTime;
    this.distanceThreshold = distanceThreshold;
  }

  /**
   * 检查是否允许创建节点
   * @param location 创建位置
   * @returns 是否允许创建
   */
  canCreate(location: Vector): boolean {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastCreationTime;
    const locationDiff = location.distance(this.lastCreationLocation);

    // 检查是否在冷却时间内且位置相近
    if (timeDiff < this.cooldownTime && locationDiff < this.distanceThreshold) {
      console.log(
        `${this.name}创建被限速阻止: 时间间隔${timeDiff}ms < ${this.cooldownTime}ms, ` +
          `距离${locationDiff.toFixed(1)}px < ${this.distanceThreshold}px`,
      );
      return false;
    }

    return true;
  }

  /**
   * 记录创建操作
   * @param location 创建位置
   */
  recordCreation(location: Vector): void {
    this.lastCreationTime = Date.now();
    this.lastCreationLocation = location.clone();
  }

  /**
   * 尝试创建（检查并记录）
   * @param location 创建位置
   * @returns 是否允许创建
   */
  tryCreate(location: Vector): boolean {
    if (this.canCreate(location)) {
      this.recordCreation(location);
      return true;
    }
    return false;
  }

  /**
   * 重置限速器状态
   */
  reset(): void {
    this.lastCreationTime = 0;
    this.lastCreationLocation = Vector.getZero();
  }
}

// 全局限速器实例
export const textNodeRateLimiter = new NodeCreationRateLimiter("文本节点", 300, 50);
export const connectPointRateLimiter = new NodeCreationRateLimiter("连接点", 300, 50);

// 通用的双击创建限速器，用于防止任何双击事件重复触发
export const doubleClickRateLimiter = new NodeCreationRateLimiter("双击事件", 200, 30);
