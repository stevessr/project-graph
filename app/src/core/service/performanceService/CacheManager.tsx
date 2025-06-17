/**
 * 全局缓存管理器
 * 用于管理各种性能优化缓存的失效和清理
 */
class CacheManagerClass {
  // 缓存失效回调函数列表
  private invalidationCallbacks: Array<() => void> = [];

  /**
   * 注册缓存失效回调
   * @param callback 缓存失效时调用的回调函数
   */
  registerInvalidationCallback(callback: () => void): void {
    this.invalidationCallbacks.push(callback);
  }

  /**
   * 清除所有注册的缓存
   * 在图结构、实体结构或 Section 结构发生变化时调用
   */
  invalidateAllCaches(): void {
    for (const callback of this.invalidationCallbacks) {
      try {
        callback();
      } catch (error) {
        console.warn("Cache invalidation callback failed:", error);
      }
    }
  }

  /**
   * 清除图相关缓存
   * 在边的增删改时调用
   */
  invalidateGraphCaches(): void {
    // 这里可以添加更细粒度的缓存失效逻辑
    this.invalidateAllCaches();
  }

  /**
   * 清除 Section 相关缓存
   * 在 Section 结构变化时调用
   */
  invalidateSectionCaches(): void {
    // 这里可以添加更细粒度的缓存失效逻辑
    this.invalidateAllCaches();
  }

  /**
   * 清除实体相关缓存
   * 在实体增删改时调用
   */
  invalidateEntityCaches(): void {
    // 这里可以添加更细粒度的缓存失效逻辑
    this.invalidateAllCaches();
  }
}

// 导出单例实例
export const CacheManager = new CacheManagerClass();

/**
 * 渲染缓存管理器，用于优化渲染系统的性能
 */
class RenderCache {
  private static instance: RenderCache;
  private visibleEntitiesCache: Map<string, any[]> = new Map();
  private lastViewRectangle: any = null;
  private lastUpdateTime = 0;
  private cacheValidityDuration = 16; // 16ms 缓存有效期（约60fps）

  static getInstance(): RenderCache {
    if (!RenderCache.instance) {
      RenderCache.instance = new RenderCache();
    }
    return RenderCache.instance;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(viewRectangle: any): boolean {
    const timeDiff = Date.now() - this.lastUpdateTime;
    const viewChanged =
      !this.lastViewRectangle ||
      this.lastViewRectangle.location.x !== viewRectangle.location.x ||
      this.lastViewRectangle.location.y !== viewRectangle.location.y ||
      this.lastViewRectangle.size.x !== viewRectangle.size.x ||
      this.lastViewRectangle.size.y !== viewRectangle.size.y;

    return timeDiff < this.cacheValidityDuration && !viewChanged;
  }

  /**
   * 清除渲染缓存
   */
  invalidateCache(): void {
    this.visibleEntitiesCache.clear();
    this.lastViewRectangle = null;
    this.lastUpdateTime = 0;
  }

  /**
   * 获取可见实体（带缓存）
   */
  getVisibleEntities(viewRectangle: any, entities: any[], filterFn?: (entity: any) => boolean): any[] {
    const cacheKey = `visible_${filterFn ? "filtered" : "all"}`;

    console.log("getVisibleEntities被调用:", {
      cacheKey,
      entitiesCount: entities.length,
      entityUUIDs: entities.map((e: any) => e.uuid || "no-uuid"),
      isCacheValid: this.isCacheValid(viewRectangle),
      hasCachedResult: this.visibleEntitiesCache.has(cacheKey),
    });

    if (this.isCacheValid(viewRectangle) && this.visibleEntitiesCache.has(cacheKey)) {
      const cachedResult = this.visibleEntitiesCache.get(cacheKey)!;
      console.log("使用缓存结果:", cachedResult.length, "个实体");
      return cachedResult;
    }

    console.log("重新计算可见实体...");
    // 计算可见实体
    const visibleEntities = entities.filter((entity) => {
      if (filterFn && !filterFn(entity)) {
        console.log("实体被filterFn过滤:", entity.uuid || "no-uuid");
        return false;
      }
      const isOver = this.isEntityOverView(viewRectangle, entity);
      if (isOver) {
        console.log("实体超出视野:", entity.uuid || "no-uuid");
      }
      return !isOver;
    });

    console.log("计算完成，可见实体:", visibleEntities.length, "个");

    this.visibleEntitiesCache.set(cacheKey, visibleEntities);
    this.lastViewRectangle = {
      location: { x: viewRectangle.location.x, y: viewRectangle.location.y },
      size: { x: viewRectangle.size.x, y: viewRectangle.size.y },
    };
    this.lastUpdateTime = Date.now();

    return visibleEntities;
  }

  /**
   * 检查实体是否在视图外（简化版本）
   */
  private isEntityOverView(viewRectangle: any, entity: any): boolean {
    const entityRect = entity.collisionBox.getRectangle();
    const isOver =
      entityRect.right < viewRectangle.left ||
      entityRect.left > viewRectangle.right ||
      entityRect.bottom < viewRectangle.top ||
      entityRect.top > viewRectangle.bottom;

    // 调试：输出视野检查信息
    if (entity.uuid) {
      console.log("缓存视野检查:", {
        uuid: entity.uuid,
        entityRect: `(${entityRect.left.toFixed(1)}, ${entityRect.top.toFixed(1)}) - (${entityRect.right.toFixed(1)}, ${entityRect.bottom.toFixed(1)})`,
        viewRect: `(${viewRectangle.left.toFixed(1)}, ${viewRectangle.top.toFixed(1)}) - (${viewRectangle.right.toFixed(1)}, ${viewRectangle.bottom.toFixed(1)})`,
        isOver: isOver,
      });
    }

    return isOver;
  }
}

/**
 * 空间索引缓存，用于优化位置查找
 */
class SpatialIndexCache {
  private static instance: SpatialIndexCache;
  private spatialGrid: Map<string, any[]> = new Map();
  private gridSize = 100; // 网格大小
  private lastUpdateTime = 0;
  private cacheValidityDuration = 100; // 100ms 缓存有效期

  static getInstance(): SpatialIndexCache {
    if (!SpatialIndexCache.instance) {
      SpatialIndexCache.instance = new SpatialIndexCache();
    }
    return SpatialIndexCache.instance;
  }

  /**
   * 清除空间索引缓存
   */
  invalidateCache(): void {
    this.spatialGrid.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * 获取网格键
   */
  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  /**
   * 构建空间索引
   */
  buildSpatialIndex(entities: any[]): void {
    if (Date.now() - this.lastUpdateTime < this.cacheValidityDuration) {
      return; // 缓存仍然有效
    }

    this.spatialGrid.clear();

    for (const entity of entities) {
      const rect = entity.collisionBox.getRectangle();
      const startGridX = Math.floor(rect.left / this.gridSize);
      const endGridX = Math.floor(rect.right / this.gridSize);
      const startGridY = Math.floor(rect.top / this.gridSize);
      const endGridY = Math.floor(rect.bottom / this.gridSize);

      for (let gx = startGridX; gx <= endGridX; gx++) {
        for (let gy = startGridY; gy <= endGridY; gy++) {
          const key = `${gx},${gy}`;
          if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, []);
          }
          this.spatialGrid.get(key)!.push(entity);
        }
      }
    }

    this.lastUpdateTime = Date.now();
  }

  /**
   * 查找位置上的实体
   */
  findEntitiesAtLocation(location: any, entities: any[]): any[] {
    this.buildSpatialIndex(entities);

    const gridKey = this.getGridKey(location.x, location.y);
    const candidates = this.spatialGrid.get(gridKey) || [];

    return candidates.filter((entity) => entity.collisionBox.isContainsPoint(location));
  }
}

// 导出缓存类实例以供外部使用
export const RenderCacheInstance = RenderCache.getInstance();
export const SpatialIndexCacheInstance = SpatialIndexCache.getInstance();

// 注册渲染缓存失效回调
CacheManager.registerInvalidationCallback(() => {
  RenderCache.getInstance().invalidateCache();
  SpatialIndexCache.getInstance().invalidateCache();
});
