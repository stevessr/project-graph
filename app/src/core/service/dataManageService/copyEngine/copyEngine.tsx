import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Serialized } from "@/types/node";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Image } from "@tauri-apps/api/image";
import { readText, writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { MouseLocation } from "../../controlService/MouseLocation";
import { RectangleNoteEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleNoteReversedEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteReversedEffect";
import { VirtualClipboard } from "./VirtualClipboard";
import { CopyEngineImage } from "./copyEngineImage";
import { CopyEngineText } from "./copyEngineText";
import { toast } from "sonner";

/**
 * 专门用来管理节点复制的引擎
 */
@service("copyEngine")
export class CopyEngine {
  private copyEngineImage: CopyEngineImage;
  private copyEngineText: CopyEngineText;

  constructor(private readonly project: Project) {
    this.copyEngineImage = new CopyEngineImage(project);
    this.copyEngineText = new CopyEngineText(project);
  }

  /**
   * 用户按下了ctrl+c，
   * 将当前选中的节点复制到虚拟粘贴板
   * 也要将选中的部分复制到系统粘贴板
   */
  copy() {
    // 获取所有选中的实体
    const stageObjects = this.project.stageManager.getSelectedStageObjects();
    if (stageObjects.length === 0) {
      // 如果没有选中东西，就是清空虚拟粘贴板
      VirtualClipboard.clear();
      toast.success("清空了虚拟剪贴板");
      return;
    }

    // 更新虚拟剪贴板
    VirtualClipboard.copy(stageObjects);
    const rect = Rectangle.getBoundingRectangle(stageObjects.map((it) => it.collisionBox.getRectangle()));
    this.project.effects.addEffect(new RectangleNoteReversedEffect(new ProgressNumber(0, 100), rect, Color.Green));

    // 更新系统剪贴板
    // 如果只有一张图片就直接复制图片
    if (stageObjects.length === 1 && stageObjects[0] instanceof ImageNode) {
      const imageNode = stageObjects[0] as ImageNode;
      const blob = this.project.attachments.get(imageNode.attachmentId);
      if (blob) {
        blob.arrayBuffer().then(Image.fromBytes).then(writeImage);
        toast.success("已将选中的图片复制到系统剪贴板");
      }
    } else {
      // 否则复制全部文本节点，用两个换行分割
      const textNodes = stageObjects.filter((it) => it instanceof TextNode) as TextNode[];
      if (textNodes.length > 0) {
        const text = textNodes.map((it) => it.text).join("\n\n");
        writeText(text);
        toast.success("已将选中的文本复制到系统剪贴板");
      }
    }
  }

  /**
   * 用户按下了ctrl+v，将粘贴板数据粘贴到画布上
   */
  paste() {
    // 如果有虚拟粘贴板数据，则优先粘贴虚拟粘贴板上的东西
    if (VirtualClipboard.hasData()) {
      this.virtualClipboardPaste();
    } else {
      this.readSystemClipboardAndPaste();
    }
  }

  virtualClipboardPaste() {
    // 获取虚拟粘贴板上数据的外接矩形
    const rect = Rectangle.getBoundingRectangle(
      VirtualClipboard.paste().map((it: StageObject) => it.collisionBox.getRectangle()),
    );
    // 将鼠标位置转换为世界坐标
    const mouseWorldLocation = this.project.renderer.transformView2World(MouseLocation.vector());
    // 计算偏移量，使得粘贴的内容在鼠标位置附近
    const delta = mouseWorldLocation.subtract(rect.location);
    const data: StageObject[] = VirtualClipboard.paste().map((it: StageObject) => {
      if (it instanceof Entity) {
        return deserialize(
          {
            ...serialize(it),
            uuid: undefined,
            collisionBox: new CollisionBox([it.collisionBox.getRectangle().translate(delta)]),
          },
          this.project,
        );
      }
    });
    this.project.stage.push(...data);
    this.project.effects.addEffect(
      new RectangleNoteEffect(new ProgressNumber(0, 50), rect.translate(delta), Color.Green),
    );
    data.map((it) => {
      if (it instanceof Entity) {
        it.isSelected = true;
      }
      return it;
    });
    this.project.stageObjectSelectCounter.update();
  }

  /**
   * 剪切
   * 复制，然后删除选中的舞台对象
   */
  cut() {
    this.copy();
    this.project.stageManager.deleteSelectedStageObjects();
  }

  async readSystemClipboardAndPaste() {
    try {
      const text = await readText();
      this.copyEngineText.copyEnginePastePlainText(text);
    } catch (err) {
      console.warn("文本剪贴板是空的", err);
      try {
        await this.copyEngineImage.processClipboardImage();
      } catch (err) {
        console.error("粘贴图片时发生错误:", err);
        console.error("错误详情:", {
          name: err instanceof Error ? err.name : "Unknown",
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : "No stack",
        });
      }
    }
  }
}

export function getRectangleFromSerializedEntities(serializedEntities: Serialized.Entity[]): Rectangle {
  const rectangles = [];
  for (const node of serializedEntities) {
    if (
      Serialized.isTextNode(node) ||
      Serialized.isSection(node) ||
      Serialized.isImageNode(node) ||
      Serialized.isUrlNode(node) ||
      Serialized.isPortalNode(node) ||
      Serialized.isSvgNode(node)
    ) {
      // 比较常规的矩形
      rectangles.push(new Rectangle(new Vector(...node.location), new Vector(...node.size)));
    }
    if (node.type === "core:connect_point") {
      rectangles.push(new Rectangle(new Vector(...node.location), new Vector(1, 1)));
    } else if (node.type === "core:pen_stroke") {
      // rectangles.push(new Rectangle(new Vector(...node.location), new Vector(1, 1)));
      // TODO: 画笔粘贴板矩形暂时不考虑
    }
  }
  return Rectangle.getBoundingRectangle(rectangles);
}
