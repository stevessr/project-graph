import { Vector } from "../../../dataStruct/Vector";
import { Canvas } from "../../../stage/Canvas";
import { Stage } from "../../../stage/Stage";
import { ViewOutlineFlashEffect } from "../../feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { StageStyleManager } from "../../feedbackService/stageStyle/StageStyleManager";
import { Popup } from "../../../../components/popup"; // Added Popup import
import { MouseLocation } from "../MouseLocation"; // Added MouseLocation import

/**
 * 控制器类，用于处理事件绑定和解绑
 * 每一个对象都是一个具体的功能
 */
export class ControllerClass {
  constructor() {}

  public lastMoveLocation: Vector = Vector.getZero();
  private lastClickTime: number = 0;
  private lastClickLocation: Vector = Vector.getZero();

  // For long press detection
  private longPressTimer: number | null = null;
  private readonly longPressDuration: number = 750; // ms
  private touchStartDataForTapOrLongPress: { event: MouseEvent; id: number } | null = null;
  private readonly longPressMoveThreshold: number = 10; // pixels
  private longPressActionExecuted: boolean = false;
  // End of long press properties

  public keydown: (event: KeyboardEvent) => void = () => {};
  public keyup: (event: KeyboardEvent) => void = () => {};
  public mousedown: (event: MouseEvent) => void = () => {};
  public mouseup: (event: MouseEvent) => void = () => {};
  public mousemove: (event: MouseEvent) => void = () => {};
  public mousewheel: (event: WheelEvent) => void = () => {};
  public mouseDoubleClick: (event: MouseEvent) => void = () => {};
  // Original touchstart, touchmove, touchend will be replaced by _touchstart, _touchmove, _touchend
  // public touchstart: (event: TouchEvent) => void = () => {};
  // public touchmove: (event: TouchEvent) => void = () => {};
  // public touchend: (event: TouchEvent) => void = () => {};

  /**
   * 这个函数将在总控制器初始化是统一调用。
   * 调用之前，确保实例控制器的事件函数已经被赋值
   * 如果没有赋值被自动过滤，
   * 一旦绑定，后期就一定不要再换绑！
   */
  public init() {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    Canvas.element.addEventListener("mousedown", this.mousedown);
    Canvas.element.addEventListener("mouseup", this._mouseup);
    Canvas.element.addEventListener("mousemove", this.mousemove);
    Canvas.element.addEventListener("wheel", this.mousewheel);
    Canvas.element.addEventListener("touchstart", this._touchstart);
    Canvas.element.addEventListener("touchmove", this._touchmove);
    Canvas.element.addEventListener("touchend", this._touchend);

    // 有待优雅
  }
  public destroy() {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    Canvas.element.removeEventListener("mousedown", this.mousedown);
    Canvas.element.removeEventListener("mouseup", this._mouseup);
    Canvas.element.removeEventListener("mousemove", this.mousemove);
    Canvas.element.removeEventListener("wheel", this.mousewheel);
    Canvas.element.removeEventListener("touchstart", this._touchstart);
    Canvas.element.removeEventListener("touchmove", this._touchmove);
    Canvas.element.removeEventListener("touchend", this._touchend);

    this.lastMoveLocation = Vector.getZero();
    this.clearLongPressTimerAndReset();
  }

  private clearLongPressTimerAndReset(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    // Reset related state, but not touchStartDataForTapOrLongPress immediately,
    // as _touchend or _touchmove might need it to decide action.
    // this.longPressActionExecuted is reset by _touchend or _touchstart.
  }

  private executeLongPress(startEvent: MouseEvent): void {
    if (!this.touchStartDataForTapOrLongPress) return; // Should have data if timer fired for it

    // Update MouseLocation for Popup to use
    MouseLocation.x = startEvent.clientX;
    MouseLocation.y = startEvent.clientY;

    const menuContent = (
      <div
        style={{
          padding: "8px",
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{ padding: "6px 12px", cursor: "pointer", hover: { background: "#f0f0f0" } }}
          onClick={() => {
            console.log("Context Menu: Item 1 clicked");
            Popup.show(<div></div>, false); /* Hack to close, ideally Popup handles this */
          }}
        >
          Menu Item 1
        </div>
        <div
          style={{ padding: "6px 12px", cursor: "pointer", hover: { background: "#f0f0f0" } }}
          onClick={() => {
            console.log("Context Menu: Item 2 clicked");
            Popup.show(<div></div>, false);
          }}
        >
          Menu Item 2
        </div>
        <div
          style={{ padding: "6px 12px", cursor: "pointer", hover: { background: "#f0f0f0" } }}
          onClick={() => {
            console.log("Context Menu: Action C");
            Popup.show(<div></div>, false);
          }}
        >
          Another Action
        </div>
      </div>
    );

    Popup.show(menuContent).then(() => {
      // Optional: Code to run after the popup is closed
      console.log("Popup closed");
    });

    this.longPressActionExecuted = true;
    this.touchStartDataForTapOrLongPress = null; // Consume the event, it's a long press
    this.longPressTimer = null; // Timer has done its job
  }

  // private _mousedown = (event: MouseEvent) => {
  //   this.mousedown(event);
  //   // 检测双击
  //   const now = new Date().getTime();
  //   if (
  //     now - this.lastClickTime < 300 &&
  //     this.lastClickLocation.distance(
  //       new Vector(event.clientX, event.clientY),
  //     ) < 5
  //   ) {
  //     this.mouseDoubleClick(event);
  //   }
  //   this.lastClickTime = now;
  //   this.lastClickLocation = new Vector(event.clientX, event.clientY);
  // };

  /**
   * tips:
   * 如果把双击函数写在mousedown里
   * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
   *  1按下，2抬起，3按下，4抬起
   *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
   *  挡在了canvas上面。导致第四步抬起释放没有监听到了
   *  进而导致：
   *  双击创建节点后会有一个框选框吸附在鼠标上
   *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
   * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
   * ——2024年12月5日
   * @param event 鼠标事件对象
   */
  private _mouseup = (event: MouseEvent) => {
    this.mouseup(event);
    // 检测双击
    const now = new Date().getTime();
    if (
      now - this.lastClickTime < 300 &&
      this.lastClickLocation.distance(new Vector(event.clientX, event.clientY)) < 20
    ) {
      this.mouseDoubleClick(event);
    }
    this.lastClickTime = now;
    this.lastClickLocation = new Vector(event.clientX, event.clientY);
  };

  private _touchstart = (event: TouchEvent) => {
    event.preventDefault();
    this.longPressActionExecuted = false; // Reset flag for new touch interaction
    this.clearLongPressTimerAndReset(); // Clear any existing timer

    if (event.touches.length === 0) return; // Should not happen

    // We primarily handle long press for the first touch point.
    const firstTouch = event.touches[0];

    // If it's a multi-touch scenario, the original code had special handling.
    if (event.touches.length > 1) {
      Stage.selectMachine.shutDown();
      // For simplicity, we might ignore long press for multi-touch or only track the first.
      // Current logic will proceed to set up long press for the first touch.
    }

    const touchEventForLogic = {
      ...(firstTouch as any), // Spread properties from Touch
      button: 0, // Simulate left-click like behavior
      clientX: firstTouch.clientX,
      clientY: firstTouch.clientY,
    } as MouseEvent;

    this.touchStartDataForTapOrLongPress = { event: touchEventForLogic, id: firstTouch.identifier };

    this.longPressTimer = window.setTimeout(() => {
      // Check if touchStartData still corresponds to this timer's intent
      if (this.touchStartDataForTapOrLongPress && this.touchStartDataForTapOrLongPress.id === firstTouch.identifier) {
        this.executeLongPress(touchEventForLogic);
      }
    }, this.longPressDuration);
  };

  private _touchmove = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 0) return;

    const lastTouchForGeneralMove = event.touches[event.touches.length - 1];
    this.onePointTouchMoveLocation = new Vector(lastTouchForGeneralMove.clientX, lastTouchForGeneralMove.clientY);

    // Long press cancellation logic
    if (this.touchStartDataForTapOrLongPress && this.longPressTimer) {
      const trackedTouch = Array.from(event.touches).find(
        (t) => t.identifier === this.touchStartDataForTapOrLongPress!.id,
      );
      if (trackedTouch) {
        const moveDistance = new Vector(trackedTouch.clientX, trackedTouch.clientY).distance(
          new Vector(
            this.touchStartDataForTapOrLongPress.event.clientX,
            this.touchStartDataForTapOrLongPress.event.clientY,
          ),
        );

        if (moveDistance > this.longPressMoveThreshold) {
          this.clearLongPressTimerAndReset(); // Cancel long press
          // This is now a drag. Call mousedown with the original start event.
          this.mousedown(this.touchStartDataForTapOrLongPress.event);
          this.touchStartDataForTapOrLongPress = null; // Consumed by drag initiation
        }
      } else {
        // The touch we were tracking for long press is gone.
        this.clearLongPressTimerAndReset();
        if (this.touchStartDataForTapOrLongPress) {
          // If it was a pending tap/longpress
          this.mousedown(this.touchStartDataForTapOrLongPress.event); // Treat as drag start
          this.touchStartDataForTapOrLongPress = null;
        }
      }
    }

    // General mousemove logic, similar to original
    const mouseMoveEvent = {
      ...(lastTouchForGeneralMove as any),
      button: 0,
      clientX: this.onePointTouchMoveLocation.x,
      clientY: this.onePointTouchMoveLocation.y,
    } as MouseEvent;
    this.mousemove(mouseMoveEvent);
  };

  // onePointTouchMoveLocation is used by _touchend for coordinates
  private onePointTouchMoveLocation: Vector = Vector.getZero();

  private _touchend = (event: TouchEvent) => {
    event.preventDefault();
    this.clearLongPressTimerAndReset();

    if (this.longPressActionExecuted) {
      // this.longPressActionExecuted is reset at the start of a new touch (_touchstart)
      return; // Long press action was handled, suppress tap/mouseup
    }

    // Use changedTouches to find the touch that was lifted.
    // The original code had a potential issue using event.touches for the touchend event object.
    const endedTouch = event.changedTouches[0];
    if (!endedTouch) return; // Should be at least one changedTouch

    // Use onePointTouchMoveLocation for final coordinates, as per original logic for touchend
    const logicalMouseUpEvent = {
      ...(endedTouch as any), // Spread properties from the ended Touch
      button: 0,
      clientX: this.onePointTouchMoveLocation.x,
      clientY: this.onePointTouchMoveLocation.y,
    } as MouseEvent;

    if (this.touchStartDataForTapOrLongPress && this.touchStartDataForTapOrLongPress.id === endedTouch.identifier) {
      // This was a tap (long press timer didn't fire or was cleared by this touchend, and not dragged out of threshold)
      const startEventForTap = this.touchStartDataForTapOrLongPress.event;
      this.touchStartDataForTapOrLongPress = null; // Consume

      this.mousedown(startEventForTap);
      this._mouseup(logicalMouseUpEvent);
    } else {
      // This was the end of a drag (mousedown already called by _touchmove when threshold was crossed)
      // OR the touch that ended was not the one we were tracking for tap/longpress
      // OR longPressActionExecuted was true (already handled)
      this._mouseup(logicalMouseUpEvent);
    }
  };

  /**
   * 鼠标移出窗口越界，强行停止功能
   * @param _outsideLocation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector) {
    Stage.effectMachine.addEffect(ViewOutlineFlashEffect.short(StageStyleManager.currentStyle.effects.warningShadow));
  }
}
