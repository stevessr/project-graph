import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Serialized } from "@/types/node";
import { PathString } from "@/utils/pathString";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Image } from "@tauri-apps/api/image";
import { readImage, readText, writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { MouseLocation } from "../../controlService/MouseLocation";
import { RectangleNoteEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleNoteReversedEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteReversedEffect";
import { RectanglePushInEffect } from "../../feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { VirtualClipboard } from "./VirtualClipboard";

/**
 * 专门用来管理节点复制的引擎
 */
@service("copyEngine")
export class CopyEngine {
  constructor(private readonly project: Project) {}

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
      }
    } else {
      // 否则复制全部文本节点，用两个换行分割
      const textNodes = stageObjects.filter((it) => it instanceof TextNode) as TextNode[];
      if (textNodes.length > 0) {
        const text = textNodes.map((it) => it.text).join("\n\n");
        writeText(text);
      }
    }
  }

  /**
   * 用户按下了ctrl+v，将粘贴板数据粘贴到画布上
   */
  paste() {
    // 如果有虚拟粘贴板数据，则优先粘贴虚拟粘贴板上的东西
    if (VirtualClipboard.hasData()) {
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
    } else {
      this.readClipboard();
    }
  }

  /** 复制，然后删除选中的舞台对象 */
  cut() {
    this.copy();
    this.project.stageManager.deleteSelectedStageObjects();
  }

  async readClipboard() {
    try {
      const text = await readText();
      this.copyEnginePastePlainText(text);
    } catch (err) {
      console.warn("文本剪贴板是空的", err);
    }
    try {
      // https://github.com/HuLaSpark/HuLa/blob/fe37c246777cde3325555ed2ba2fcf860888a4a8/src/utils/ImageUtils.ts#L121
      const image = await readImage();
      const bytes = await image.rgba();
      const buffer = bytes.buffer;
      const blob = new Blob(
        [
          "SharedArrayBuffer" in window && buffer instanceof SharedArrayBuffer
            ? (buffer.slice(0) as unknown as ArrayBuffer)
            : (buffer as ArrayBuffer),
        ],
        {
          type: "image/png",
        },
      );
      this.copyEnginePasteImage(blob);
    } catch (err) {
      console.warn("图片剪贴板是空的", err);
    }
  }

  async copyEnginePastePlainText(item: string) {
    let entity: Entity | null = null;
    const collisionBox = new CollisionBox([
      new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), Vector.getZero()),
    ]);

    if (isSvgString(item)) {
      // 是SVG类型
      const attachmentId = this.project.addAttachment(new Blob([item], { type: "image/svg+xml" }));
      entity = new SvgNode(this.project, {
        attachmentId,
        collisionBox,
      });
    } else if (PathString.isValidURL(item)) {
      // 是URL类型
      entity = new UrlNode(this.project, {
        title: "链接",
        url: item,
        collisionBox: new CollisionBox([
          new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
        ]),
      });
    } else if (isMermaidGraphString(item)) {
      // 是Mermaid图表类型
      entity = new TextNode(this.project, {
        text: "mermaid图表",
        details: "```mermaid\n" + item + "\n```",
        collisionBox,
      });
    } else {
      const { valid, text, url } = PathString.isMarkdownUrl(item);
      if (valid) {
        // 是Markdown链接类型
        entity = new UrlNode(this.project, {
          title: text,
          uuid: crypto.randomUUID(),
          url: url,
          location: [MouseLocation.x, MouseLocation.y],
        });
      } else {
        // 只是普通的文本
        if (item.length > 3000) {
          entity = new TextNode(this.project, {
            text: "粘贴板文字过长",
            collisionBox,
            details: item,
          });
        } else {
          entity = new TextNode(this.project, {
            text: item,
            collisionBox,
          });
          // entity.move(
          //   new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
          // );
        }
      }
    }

    if (entity !== null) {
      this.project.stageManager.add(entity);
      // 添加到section
      const mouseSections = this.project.sectionMethods.getSectionsByInnerLocation(MouseLocation);
      if (mouseSections.length > 0) {
        this.project.stageManager.goInSection([entity], mouseSections[0]);
        this.project.effects.addEffect(
          RectanglePushInEffect.sectionGoInGoOut(
            entity.collisionBox.getRectangle(),
            mouseSections[0].collisionBox.getRectangle(),
          ),
        );
      }
    }
  }

  async copyEnginePasteImage(item: Blob) {
    const attachmentId = this.project.addAttachment(item);

    const imageNode = new ImageNode(this.project, {
      attachmentId,
    });
    this.project.stageManager.add(imageNode);
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

function isSvgString(str: string): boolean {
  const trimmed = str.trim();

  // 基础结构检查
  if (trimmed.startsWith("<svg") || trimmed.endsWith("</svg>")) {
    return true;
  }

  // 提取 <svg> 标签的属性部分
  const openTagMatch = trimmed.match(/<svg/i);
  if (!openTagMatch) return false; // 无有效属性则直接失败

  // 检查是否存在 xmlns 命名空间声明
  const xmlnsRegex = /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i;
  if (!xmlnsRegex.test(openTagMatch[1])) {
    return false;
  }

  // 可选：通过 DOM 解析进一步验证（仅限浏览器环境）
  // 若在 Node.js 等无 DOM 环境，可注释此部分
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "image/svg+xml");
      const svgElement = doc.documentElement;
      return svgElement.tagName.toLowerCase() === "svg" && svgElement.namespaceURI === "http://www.w3.org/2000/svg";
    } catch {
      // 解析失败则直接失败
      toast.error("SVG 解析失败");
      return false;
    }
  }

  return true;
}

function isMermaidGraphString(str: string): boolean {
  str = str.trim();
  if (str.startsWith("graph TD;") && str.endsWith(";")) {
    return true;
  }
  return false;
}
