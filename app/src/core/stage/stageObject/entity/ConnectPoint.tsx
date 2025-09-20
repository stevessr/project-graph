import { Project } from "@/core/Project";
// import { CircleChangeRadiusEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleChangeRadiusEffect";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * 注释
 * 当质点是坍缩状态时，R=1
 * 膨胀状态，R>1，且是一个常量，可能是30，也可能是其他值，后面可能会随时调整
 */
@passExtraAtArg1
@passObject
export class ConnectPoint extends ConnectableEntity {
  // 坍缩状态半径
  static CONNECT_POINT_SHRINK_RADIUS = 1;
  // 膨胀状态半径
  static CONNECT_POINT_EXPAND_RADIUS = 30;

  get geometryCenter(): Vector {
    return this.collisionBox.getRectangle().center;
  }

  isHiddenBySectionCollapse: boolean = false;

  @serializable
  collisionBox: CollisionBox;
  @id
  @serializable
  uuid: string;

  get radius(): number {
    return this._isSelected ? ConnectPoint.CONNECT_POINT_EXPAND_RADIUS : ConnectPoint.CONNECT_POINT_SHRINK_RADIUS;
  }

  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;

  /**
   * 获取节点的选中状态
   */
  public get isSelected() {
    return this._isSelected;
  }

  public set isSelected(value: boolean) {
    const oldValue = this._isSelected;
    if (oldValue === value) {
      return;
    }
    this._isSelected = value;

    const rectangle = this.collisionBox.shapes[0];
    if (!(rectangle instanceof Rectangle)) {
      return;
    }

    const centerLocation = this.geometryCenter.clone();
    if (value) {
      // 变为选中，放大
      rectangle.size = Vector.same(ConnectPoint.CONNECT_POINT_EXPAND_RADIUS * 2);
      rectangle.location = centerLocation.subtract(Vector.same(ConnectPoint.CONNECT_POINT_EXPAND_RADIUS));
    } else {
      // 变为 未选中，缩小
      rectangle.size = Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2);
      rectangle.location = centerLocation.subtract(Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS));
    }
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([
        new Rectangle(Vector.getZero(), Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2)),
      ]),
      details = [],
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.collisionBox = collisionBox;
    this.details = details;
  }

  move(delta: Vector): void {
    const newRectangle = this.collisionBox.getRectangle();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  moveTo(location: Vector): void {
    const newRectangle = this.collisionBox.getRectangle();
    newRectangle.location = location;
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
}
