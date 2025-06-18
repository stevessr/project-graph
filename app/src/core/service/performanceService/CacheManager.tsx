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
 * 支持涂鸦特殊处理和选择性实体渲染
 */
class RenderCache {
  private static instance: RenderCache;
  private visibleEntitiesCache: Map<string, any[]> = new Map();
  private lastViewRectangle: any = null;
  private lastUpdateTime = 0;
  private cacheValidityDuration = 16; // 16ms 缓存有效期（约60fps）

  // 渲染控制选项
  private renderingOptions = {
    disablePenStrokeFiltering: true, // 禁用涂鸦过滤，确保涂鸦始终渲染
    enableSelectiveRendering: true, // 启用选择性渲染
    penStrokeRenderPriority: "high", // 涂鸦渲染优先级：'high' | 'normal' | 'low'
  };

  static getInstance(): RenderCache {
    if (!RenderCache.instance) {
      RenderCache.instance = new RenderCache();
      console.log("🎨 RenderCache实例已创建，渲染选项:", RenderCache.instance.renderingOptions);
    }
    return RenderCache.instance;
  }

  /**
   * 设置渲染选项
   */
  setRenderingOptions(options: Partial<typeof this.renderingOptions>): void {
    this.renderingOptions = { ...this.renderingOptions, ...options };
    this.invalidateCache(); // 选项变更时清除缓存
  }

  /**
   * 获取当前渲染选项
   */
  getRenderingOptions() {
    return { ...this.renderingOptions };
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
   * 获取可见实体（带缓存，支持涂鸦特殊处理）
   */
  getVisibleEntities(viewRectangle: any, entities: any[], filterFn?: (entity: any) => boolean): any[] {
    // 检查是否有涂鸦实体，如果有且禁用了涂鸦过滤，则跳过缓存
    const hasPenStrokes = entities.some((entity) => this.isPenStroke(entity));
    const shouldSkipCache = hasPenStrokes && this.renderingOptions.disablePenStrokeFiltering;

    const cacheKey = `visible_${filterFn ? "filtered" : "all"}`;

    console.log("getVisibleEntities被调用:", {
      cacheKey,
      entitiesCount: entities.length,
      entityUUIDs: entities.map((e: any) => e.uuid || "no-uuid"),
      hasPenStrokes,
      shouldSkipCache,
      isCacheValid: this.isCacheValid(viewRectangle),
      hasCachedResult: this.visibleEntitiesCache.has(cacheKey),
      renderingOptions: this.renderingOptions,
    });

    if (!shouldSkipCache && this.isCacheValid(viewRectangle) && this.visibleEntitiesCache.has(cacheKey)) {
      const cachedResult = this.visibleEntitiesCache.get(cacheKey)!;
      console.log("使用缓存结果:", cachedResult.length, "个实体");
      return cachedResult;
    }

    console.log("重新计算可见实体...");
    // 计算可见实体
    const visibleEntities = entities.filter((entity) => {
      // 应用自定义过滤函数
      if (filterFn && !filterFn(entity)) {
        console.log("实体被filterFn过滤:", entity.uuid || "no-uuid");
        return false;
      }

      // 涂鸦特殊处理：如果禁用涂鸦过滤，则涂鸦始终可见
      if (this.renderingOptions.disablePenStrokeFiltering && this.isPenStroke(entity)) {
        console.log("🎨 涂鸦实体跳过视野过滤:", entity.uuid || "no-uuid", "渲染选项:", this.renderingOptions);
        return true;
      }

      // 常规视野检查
      const isOver = this.isEntityOverView(viewRectangle, entity);
      if (isOver) {
        console.log("实体超出视野:", entity.uuid || "no-uuid", entity.constructor.name);
      }
      return !isOver;
    });

    console.log("计算完成，可见实体:", visibleEntities.length, "个");

    // 只有在不跳过缓存的情况下才存储缓存结果
    if (!shouldSkipCache) {
      this.visibleEntitiesCache.set(cacheKey, visibleEntities);
      this.lastViewRectangle = {
        location: { x: viewRectangle.location.x, y: viewRectangle.location.y },
        size: { x: viewRectangle.size.x, y: viewRectangle.size.y },
      };
      this.lastUpdateTime = Date.now();
    } else {
      console.log("🎨 跳过缓存存储，因为涂鸦过滤已禁用");
    }

    return visibleEntities;
  }

  /**
   * 检查实体是否为涂鸦（PenStroke）
   */
  private isPenStroke(entity: any): boolean {
    // 检查实体类型，支持多种判断方式
    const isPenStroke =
      entity?.constructor?.name === "PenStroke" ||
      entity?.type === "core:pen_stroke" ||
      (typeof entity?.getSegmentList === "function" && typeof entity?.getColor === "function");

    if (isPenStroke) {
      console.log("🎨 检测到涂鸦实体:", entity.uuid || "no-uuid", "类型:", entity?.constructor?.name);
    }

    return isPenStroke;
  }

  /**
   * 检查实体是否在视图外（与主渲染器保持一致）
   */
  private isEntityOverView(viewRectangle: any, entity: any): boolean {
    const entityRect = entity.collisionBox.getRectangle();

    // 使用与主渲染器相同的碰撞检测逻辑
    // 如果视图矩形与实体矩形不相交，则认为实体超出视野
    const isOver = !this.isRectangleCollideWith(viewRectangle, entityRect);

    // 调试：输出视野检查信息
    if (entity.uuid) {
      console.log("缓存视野检查:", {
        uuid: entity.uuid,
        entityType: entity.constructor?.name || "unknown",
        isPenStroke: this.isPenStroke(entity),
        entityRect: `(${entityRect.left.toFixed(1)}, ${entityRect.top.toFixed(1)}) - (${entityRect.right.toFixed(1)}, ${entityRect.bottom.toFixed(1)})`,
        viewRect: `(${viewRectangle.left.toFixed(1)}, ${viewRectangle.top.toFixed(1)}) - (${viewRectangle.right.toFixed(1)}, ${viewRectangle.bottom.toFixed(1)})`,
        isOver: isOver,
      });
    }

    return isOver;
  }

  /**
   * 检查两个矩形是否相交（与Rectangle.isCollideWith保持一致）
   */
  private isRectangleCollideWith(rect1: any, rect2: any): boolean {
    const collision_x = rect1.right > rect2.left && rect1.left < rect2.right;
    const collision_y = rect1.bottom > rect2.top && rect1.top < rect2.bottom;
    return collision_x && collision_y;
  }

  /**
   * 获取按优先级排序的可见实体
   * 涂鸦根据设置的优先级进行排序
   */
  getVisibleEntitiesWithPriority(viewRectangle: any, entities: any[], filterFn?: (entity: any) => boolean): any[] {
    // 确保传递filterFn参数，让涂鸦过滤禁用逻辑生效
    const visibleEntities = this.getVisibleEntities(viewRectangle, entities, filterFn);

    if (!this.renderingOptions.enableSelectiveRendering) {
      return visibleEntities;
    }

    // 按优先级分组
    const penStrokes: any[] = [];
    const otherEntities: any[] = [];

    visibleEntities.forEach((entity) => {
      if (this.isPenStroke(entity)) {
        penStrokes.push(entity);
      } else {
        otherEntities.push(entity);
      }
    });

    // 根据涂鸦优先级决定渲染顺序
    switch (this.renderingOptions.penStrokeRenderPriority) {
      case "high":
        // 涂鸦最后渲染（在最上层）
        return [...otherEntities, ...penStrokes];
      case "low":
        // 涂鸦最先渲染（在最下层）
        return [...penStrokes, ...otherEntities];
      case "normal":
      default:
        // 保持原有顺序
        return visibleEntities;
    }
  }

  /**
   * 获取涂鸦实体统计信息
   */
  getPenStrokeStats(entities: any[]): { total: number; visible: number; filtered: number } {
    const penStrokes = entities.filter((entity) => this.isPenStroke(entity));
    // 不传递filterFn，让涂鸦过滤禁用逻辑生效
    const visiblePenStrokes = this.getVisibleEntities(this.lastViewRectangle || {}, penStrokes, undefined);

    return {
      total: penStrokes.length,
      visible: visiblePenStrokes.length,
      filtered: penStrokes.length - visiblePenStrokes.length,
    };
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
