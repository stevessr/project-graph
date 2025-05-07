import { Color } from "../../../dataStruct/Color";
import { Circle } from "../../../dataStruct/shape/Circle";
import { CublicCatmullRomSpline } from "../../../dataStruct/shape/CublicCatmullRomSpline";
import { SymmetryCurve } from "../../../dataStruct/shape/Curve";
import { Line } from "../../../dataStruct/shape/Line";
import { Rectangle } from "../../../dataStruct/shape/Rectangle";
import { Vector } from "../../../dataStruct/Vector";
import { Camera } from "../../../stage/Camera";
import { CollisionBox } from "../../../stage/stageObject/collisionBox/collisionBox";
import { CurveRenderer } from "../basicRenderer/curveRenderer";
import { ShapeRenderer } from "../basicRenderer/shapeRenderer";
import { Renderer } from "../renderer";
import { WorldRenderUtils } from "../utilsRenderer/WorldRenderUtils";

/**
 * 碰撞箱渲染器
 */
export namespace CollisionBoxRenderer {
  export function render(collideBox: CollisionBox, color: Color) {
    // Adjust scale for visibility at low zoom levels, preventing excessively thick lines.
    const scale = Camera.currentScale > 0.05 ? Camera.currentScale : 1;
    for (const shape of collideBox.shapeList) {
      if (shape instanceof Rectangle) {
        ShapeRenderer.renderRect(
          new Rectangle(
            Renderer.transformWorld2View(shape.location.subtract(Vector.same(7.5))),
            shape.size.add(Vector.same(15)).multiply(Camera.currentScale),
          ),
          Color.Transparent,
          color,
          8 * scale,
          16 * scale,
        );
      } else if (shape instanceof Circle) {
        ShapeRenderer.renderCircle(
          Renderer.transformWorld2View(shape.location),
          (shape.radius + 7.5) * Camera.currentScale,
          Color.Transparent,
          color,
          10 * scale,
        );
      } else if (shape instanceof Line) {
        CurveRenderer.renderSolidLine(
          Renderer.transformWorld2View(shape.start),
          Renderer.transformWorld2View(shape.end),
          color,
          12 * 2 * scale,
        );
      } else if (shape instanceof SymmetryCurve) {
        // shape.endDirection = shape.endDirection.normalize();
        // const size = 15; // 箭头大小
        // shape.end = shape.end.subtract(shape.endDirection.multiply(size / -2));
        WorldRenderUtils.renderSymmetryCurve(shape, color, 10);
      } else if (shape instanceof CublicCatmullRomSpline) {
        WorldRenderUtils.renderCublicCatmullRomSpline(shape, color, 10);
      }
    }
  }
}
