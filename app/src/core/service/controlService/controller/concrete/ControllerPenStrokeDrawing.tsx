import { Project } from "@/core/Project";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Settings } from "@/core/service/Settings";
import { PenStroke, PenStrokeSegment } from "@/core/stage/stageObject/entity/PenStroke";
import { isMac } from "@/utils/platform";
import { Color, Vector } from "@graphif/data-structures";

/**
 * 涂鸦功能
 */
export class ControllerPenStrokeDrawingClass extends ControllerClass {
  private _isUsing: boolean = false;

  /** 在移动的过程中，记录这一笔画的笔迹 */
  public currentSegments: PenStrokeSegment[] = [];
  /** 当前是否是在绘制直线 */
  public isDrawingLine = false;

  /**
   * 初始化函数
   */
  constructor(protected readonly project: Project) {
    super(project);
  }

  public mousedown = (event: PointerEvent) => {
    if (event.button === 0 && Settings.mouseLeftMode !== "draw" && event.pointerType !== "pen") {
      return;
    }
    this._isUsing = true;

    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    if (this.project.controller.pressingKeySet.has("shift")) {
      this.isDrawingLine = true;
    }
    this.lastMoveLocation = pressWorldLocation.clone();
  };

  public mousemove = (event: PointerEvent) => {
    if (!this._isUsing) return;
    if (!this.project.controller.isMouseDown[0] && Settings.mouseLeftMode === "draw") {
      return;
    }
    const events = event.getCoalescedEvents();
    for (const e of events) {
      const isPen = e.pointerType === "pen";
      const worldLocation = this.project.renderer.transformView2World(new Vector(e.clientX, e.clientY));
      this.currentSegments.push(new PenStrokeSegment(worldLocation, isPen ? e.pressure : 1));
    }
  };

  public mouseup = (event: MouseEvent) => {
    if (!this._isUsing) return;
    if (!(event.button === 0 && Settings.mouseLeftMode === "draw")) {
      return;
    }
    if (this.currentSegments.length <= 2) return;
    // 正常的划过一段距离
    // 生成笔触
    if (this.project.controller.pressingKeySet.has("shift")) {
      // 直线
      const from = this.currentSegments[0].location.clone();
      const to = this.currentSegments[this.currentSegments.length - 1].location.clone();

      if (this.project.controller.pressingKeySet.has(isMac ? "meta" : "control")) {
        // 垂直于坐标轴的直线
        const dy = Math.abs(to.y - from.y);
        const dx = Math.abs(to.x - from.x);
        if (dy > dx) {
          // 垂直
          to.x = from.x;
        } else {
          // 水平
          to.y = from.y;
        }
      }
      const startX = from.x;
      const startY = from.y;
      const endX = to.x;
      const endY = to.y;

      const stroke = new PenStroke(this.project, {
        segments: [
          new PenStrokeSegment(new Vector(startX, startY), 1),
          new PenStrokeSegment(new Vector(endX, endY), 1),
        ],
        color: this.getCurrentStrokeColor(),
      });
      this.project.stageManager.add(stroke);
    } else {
      // 普通笔迹
      const stroke = new PenStroke(this.project, {
        segments: this.currentSegments,
        color: this.getCurrentStrokeColor(),
      });
      this.project.stageManager.add(stroke);
    }

    // 清理
    this.currentSegments = [];
    this._isUsing = false;
    this.isDrawingLine = false;
  };

  public mousewheel: (event: WheelEvent) => void = (event: WheelEvent) => {
    if (!this.project.controller.pressingKeySet.has("shift")) {
      return;
    }
    if (Settings.mouseLeftMode !== "draw") {
      // 涂鸦模式下才能看到量角器，或者转动量角器
      return;
    }
    if (event.deltaY > 0) {
      this.project.drawingControllerRenderer.rotateUpAngle();
    } else {
      this.project.drawingControllerRenderer.rotateDownAngle();
    }
  };

  public getCurrentStrokeColor() {
    if (Settings.autoFillPenStrokeColorEnable) {
      return new Color(...Settings.autoFillPenStrokeColor);
    } else {
      return Color.Transparent;
    }
  }

  public changeCurrentStrokeColorAlpha(dAlpha: number) {
    if (Settings.autoFillPenStrokeColorEnable) {
      const newAlpha = Math.max(Math.min(new Color(...Settings.autoFillPenStrokeColor).a + dAlpha, 1), 0.01);
      Settings.autoFillPenStrokeColor = new Color(...Settings.autoFillPenStrokeColor).toNewAlpha(newAlpha).toArray();
    }
  }
}
