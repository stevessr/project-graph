import { join } from "@tauri-apps/api/path";
import { Serialized } from "../../../../types/node";
import { PathString } from "../../../../utils/pathString";
import { Rectangle } from "../../../dataStruct/shape/Rectangle";
import { Vector } from "../../../dataStruct/Vector";
import { Stage } from "../../Stage";
import { ConnectableEntity } from "../abstract/ConnectableEntity";
import { CollisionBox } from "../collisionBox/collisionBox";

/**
 * 一个图片节点
 * 图片的路径字符串决定了这个图片是什么
 *
 * 有两个转换过程：
 *
 * 图片路径 -> base64字符串 -> 图片Element -> 完成
 *   gettingBase64
 *     |
 *     v
 *   fileNotfound
 *   base64EncodeError
 *
 */
export class ImageNode extends ConnectableEntity {
  isHiddenBySectionCollapse: boolean = false;
  public uuid: string;
  public collisionBox: CollisionBox;
  details: string;
  /**
   * 这里的path是相对于工程文件的相对路径
   * 例如："example.png"
   */
  public path: string;
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
    this._isSelected = value;
  }

  /**
   * 图片的四种状态
   */
  public state: "loading" | "success" | "unknownError" | "loadingError" = "loading";

  public errorDetails: string = "";

  private _imageElement: HTMLImageElement = new Image();

  public get imageElement(): HTMLImageElement {
    return this._imageElement;
  }
  public scaleNumber: number = 1 / (window.devicePixelRatio || 1);
  public originImageSize: Vector = new Vector(0, 0);
  /** 左上角位置 */
  private get currentLocation() {
    return this.rectangle.location.clone();
  }

  constructor(
    {
      uuid,
      location = [0, 0],
      size = [100, 100],
      scale = 1 / (window.devicePixelRatio || 1),
      path = "",
      details = "",
    }: Partial<Serialized.ImageNode> & { uuid: string },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.path = path;
    this.details = details;
    this.scaleNumber = scale;
    this.originImageSize = new Vector(...size);

    this.collisionBox = new CollisionBox([
      new Rectangle(new Vector(...location), new Vector(...size).multiply(this.scaleNumber)),
    ]);
    this.state = "loading";
    // 初始化创建的时候，开始获取图片元素
    if (!Stage.path.isDraft()) {
      this.updateImageElementByPath(PathString.dirPath(Stage.path.getFilePath()));
    } else {
      // 一般只有在粘贴板粘贴时和初次打开文件时才调用这里
      // 所以这里只可能时初次打开文件时还是草稿的状态

      setTimeout(() => {
        this.updateImageElementByPath(PathString.dirPath(Stage.path.getFilePath()));
      }, 1000);
    }
  }

  /**
   * 根据图片路径更新图片元素
   * @param folderPath 工程文件所在路径文件夹，不加尾部斜杠
   * @returns
   */
  public updateImageElementByPath(folderPath: string) {
    if (this.path === "") {
      return;
    }

    this.state = "loading"; // Set state to loading immediately

    join(folderPath, this.path)
      .then((path) => {
        const imageElement = new Image();
        this._imageElement = imageElement;
        // Directly set the image src to the file path
        // Assuming direct file path works in Tauri webview
        imageElement.src = path;

        imageElement.onload = () => {
          // 图片加载成功
          imageElement
            .decode()
            .then(() => {
              // 调整碰撞箱大小
              this.rectangle.size = new Vector(
                imageElement.width * this.scaleNumber,
                imageElement.height * this.scaleNumber,
              );
              this.originImageSize = new Vector(imageElement.width, imageElement.height);
              this.state = "success";
            })
            .catch((decodeError) => {
              // Handle image decoding errors
              this.state = "loadingError";
              this.errorDetails = `图片解码错误: ${decodeError}`;
            });
        };
        imageElement.onerror = (error) => {
          // Handle image loading errors
          this.state = "loadingError";
          this.errorDetails = `图片加载错误: ${error.toString()}`; // More specific error message, ensure error is string
        };
      })
      .catch((_err) => {
        // Handle errors in joining path or other initial issues
        this.state = "unknownError";
        this.errorDetails = `处理图片路径时出错: ${_err.toString()}`;
      });
  }

  /**
   * 刷新，这个方法用于重新从路径中加载图片
   */
  public refresh() {
    this.updateImageElementByPath(PathString.dirPath(Stage.path.getFilePath()));
  }

  public scaleUpdate(scaleDiff: number) {
    this.scaleNumber += scaleDiff;
    if (this.scaleNumber < 0.1) {
      this.scaleNumber = 0.1;
    }
    if (this.scaleNumber > 10) {
      this.scaleNumber = 10;
    }

    this.collisionBox = new CollisionBox([
      new Rectangle(this.currentLocation, this.originImageSize.multiply(this.scaleNumber)),
    ]);
  }

  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    return this.collisionBox.shapeList[0] as Rectangle;
  }

  public get geometryCenter() {
    return this.rectangle.location.clone().add(this.rectangle.size.clone().multiply(0.5));
  }

  move(delta: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapeList[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
  moveTo(location: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapeList[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
}
