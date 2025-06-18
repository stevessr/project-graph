import { Camera } from "../../stage/Camera";
import { Stage } from "../../stage/Stage";
import { StageManager } from "../../stage/stageManager/StageManager";
import { Settings } from "../Settings";

/**
 * 变化检测管理器
 * 用于检测舞台状态变化，决定是否需要重新渲染
 */
class ChangeDetectionManagerClass {
  // 智能更新功能是否启用
  private isSmartUpdateEnabled = true;

  // 强制渲染标志
  private forceRender = false;

  // 上一帧的状态快照
  private lastSnapshot: StageSnapshot | null = null;

  // 最后一次用户交互时间
  private lastUserInteractionTime = 0;

  // 用户交互后的强制渲染帧数
  private userInteractionRenderFrames = 0;
  private readonly MAX_INTERACTION_RENDER_FRAMES = 3; // 用户交互后强制渲染3帧

  // 特效系统是否有活动
  private hasActiveEffects = false;

  // 性能统计
  private totalFrames = 0;
  private skippedFrames = 0;
  private lastStatsTime = 0;

  // 设置监听
  async init() {
    // 获取初始设置值
    this.isSmartUpdateEnabled = await Settings.get("smartFrameUpdate");

    Settings.watch("smartFrameUpdate", (value) => {
      this.isSmartUpdateEnabled = value;
      if (!value) {
        // 如果禁用智能更新，强制下一帧渲染
        this.markForceRender();
      }
    });
  }

  /**
   * 检查是否需要渲染
   */
  shouldRender(): boolean {
    this.totalFrames++;

    // 如果智能更新被禁用，总是渲染
    if (!this.isSmartUpdateEnabled) {
      return true;
    }

    // 如果有强制渲染标志，清除标志并返回true
    if (this.forceRender) {
      this.forceRender = false;
      return true;
    }

    // 如果在用户交互后的几帧内，强制渲染
    if (this.userInteractionRenderFrames > 0) {
      this.userInteractionRenderFrames--;
      return true;
    }

    // 检查是否有活动特效
    if (this.hasActiveEffects) {
      return true;
    }

    // 检查舞台状态是否有变化
    const currentSnapshot = this.createSnapshot();
    const hasChanges = this.hasStateChanged(currentSnapshot);

    if (hasChanges) {
      this.lastSnapshot = currentSnapshot;
      return true;
    }

    // 跳过渲染
    this.skippedFrames++;
    this.logPerformanceStats();
    return false;
  }

  /**
   * 标记强制渲染
   */
  markForceRender() {
    this.forceRender = true;
  }

  /**
   * 记录用户交互
   */
  recordUserInteraction() {
    this.lastUserInteractionTime = performance.now();
    this.userInteractionRenderFrames = this.MAX_INTERACTION_RENDER_FRAMES;
    this.markForceRender();
  }

  /**
   * 更新特效状态
   */
  updateEffectsState(hasActiveEffects: boolean) {
    if (this.hasActiveEffects !== hasActiveEffects) {
      this.hasActiveEffects = hasActiveEffects;
      if (hasActiveEffects) {
        this.markForceRender();
      }
    }
  }

  /**
   * 创建当前状态快照
   */
  private createSnapshot(): StageSnapshot {
    return {
      // 相机状态
      cameraLocation: { x: Camera.location.x, y: Camera.location.y },
      cameraScale: Camera.currentScale,

      // 实体数量和版本
      entityCount: StageManager.getEntities().length,
      associationCount: StageManager.getAssociations().length,
      penStrokeCount: StageManager.getPenStrokes().length,

      // 实体状态哈希（简化版本）
      entityStateHash: this.calculateEntityStateHash(),

      // 特效状态
      effectCount: Stage.effectMachine.getEffectCount(),

      // 窗口焦点状态
      isWindowFocused: Stage.isWindowFocused,
    };
  }

  /**
   * 检查状态是否有变化
   */
  private hasStateChanged(currentSnapshot: StageSnapshot): boolean {
    if (!this.lastSnapshot) {
      this.lastSnapshot = currentSnapshot;
      return true;
    }

    const last = this.lastSnapshot;

    // 检查相机变化
    if (
      Math.abs(last.cameraLocation.x - currentSnapshot.cameraLocation.x) > 0.1 ||
      Math.abs(last.cameraLocation.y - currentSnapshot.cameraLocation.y) > 0.1 ||
      Math.abs(last.cameraScale - currentSnapshot.cameraScale) > 0.001
    ) {
      return true;
    }

    // 检查实体数量变化
    if (
      last.entityCount !== currentSnapshot.entityCount ||
      last.associationCount !== currentSnapshot.associationCount ||
      last.penStrokeCount !== currentSnapshot.penStrokeCount
    ) {
      return true;
    }

    // 检查实体状态变化
    if (last.entityStateHash !== currentSnapshot.entityStateHash) {
      return true;
    }

    // 检查特效变化
    if (last.effectCount !== currentSnapshot.effectCount) {
      return true;
    }

    // 检查窗口焦点变化
    if (last.isWindowFocused !== currentSnapshot.isWindowFocused) {
      return true;
    }

    return false;
  }

  /**
   * 计算实体状态哈希（简化版本）
   */
  private calculateEntityStateHash(): string {
    // 使用实体数量和前几个实体的位置作为简单哈希
    const entities = StageManager.getEntities();
    let hash = entities.length.toString();

    // 只检查前5个实体的位置变化以提高性能
    const checkCount = Math.min(5, entities.length);
    for (let i = 0; i < checkCount; i++) {
      const entity = entities[i];
      const rect = entity.collisionBox.getRectangle();
      hash += `${Math.round(rect.location.x)},${Math.round(rect.location.y)};`;
    }

    return hash;
  }

  /**
   * 记录性能统计
   */
  private logPerformanceStats() {
    const now = performance.now();
    if (now - this.lastStatsTime > 5000) {
      // 每5秒记录一次
      const skipRate = ((this.skippedFrames / this.totalFrames) * 100).toFixed(1);
      console.log(`智能更新性能统计: 总帧数 ${this.totalFrames}, 跳过帧数 ${this.skippedFrames}, 跳过率 ${skipRate}%`);
      this.lastStatsTime = now;
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.lastSnapshot = null;
    this.forceRender = true;
    this.userInteractionRenderFrames = 0;
    this.hasActiveEffects = false;
    this.totalFrames = 0;
    this.skippedFrames = 0;
    this.lastStatsTime = 0;
  }
}

/**
 * 舞台状态快照接口
 */
interface StageSnapshot {
  cameraLocation: { x: number; y: number };
  cameraScale: number;
  entityCount: number;
  associationCount: number;
  penStrokeCount: number;
  entityStateHash: string;
  effectCount: number;
  isWindowFocused: boolean;
}

// 导出单例实例
export const ChangeDetectionManager = new ChangeDetectionManagerClass();
