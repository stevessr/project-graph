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
import { isWindows } from "@/utils/platform";
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

  /**
   * 剪切
   * 复制，然后删除选中的舞台对象
   */
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
      await this.processClipboardImage();
    } catch (err) {
      console.error("粘贴图片时发生错误:", err);
      console.error("错误详情:", {
        name: err instanceof Error ? err.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : "No stack",
      });
    }
  }

  private async processClipboardImage() {
    try {
      await this.processImageStandard();
    } catch (error) {
      console.error("标准图片处理失败，尝试Windows兼容模式:", error);
      if (isWindows) {
        console.log("检测到Windows系统，尝试备用处理方案");
        await this.processImageWindowsCompat();
      } else {
        throw error;
      }
    }
  }

  private async processImageStandard() {
    // https://github.com/HuLaSpark/HuLa/blob/fe37c246777cde3325555ed2ba2fcf860888a4a8/src/utils/ImageUtils.ts#L121
    const image = await readImage();
    console.log("读取到剪贴板图片:", image);

    const imageData = await image.rgba();
    const { width, height } = await image.size();

    console.log("图片信息:", { width, height, dataLength: imageData.length });

    if (width === 0 || height === 0) {
      console.warn("图片尺寸为0，无法处理");
      return;
    }

    // 调试：分析原始数据
    this.debugImageData(imageData);

    // 创建canvas并处理图片数据
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // 处理图片数据格式
    let processedData = this.ensureImageDataFormat(imageData, width, height);

    // 尝试不同的数据处理方式
    processedData = this.fixWindowsImageData(processedData);

    console.log("处理后的数据长度:", processedData.length);

    // 检查数据是否为空
    const isEmpty = processedData.every((byte) => byte === 0);
    if (isEmpty) {
      console.warn("图片数据为空，可能是透明图片或数据格式问题");
    }

    // 创建ImageData并绘制到canvas
    const canvasImageData = new ImageData(Uint8ClampedArray.from(processedData), width, height);
    ctx.putImageData(canvasImageData, 0, 0);

    // 验证canvas内容
    this.validateCanvasContent(ctx, width, height);

    // 创建blob
    const blob = await this.createBlobFromCanvas(canvas);

    this.copyEnginePasteImage(blob);
  }

  private debugImageData(imageData: any): void {
    if (!(imageData instanceof Uint8Array) && !(imageData instanceof Uint8ClampedArray)) {
      console.warn("未知数据类型:", imageData.constructor.name);
      return;
    }

    const data = new Uint8Array(imageData);

    // 检查数据分布
    let minR = 255,
      maxR = 0,
      minG = 255,
      maxG = 0,
      minB = 255,
      maxB = 0,
      minA = 255,
      maxA = 0;
    let nonZeroPixels = 0;
    let fullyTransparentPixels = 0;
    let fullyOpaquePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
      minA = Math.min(minA, a);
      maxA = Math.max(maxA, a);

      if (r > 0 || g > 0 || b > 0 || a > 0) {
        nonZeroPixels++;
      }

      if (a === 0) {
        fullyTransparentPixels++;
      } else if (a === 255) {
        fullyOpaquePixels++;
      }
    }

    console.log("图片数据详细分析:", {
      totalPixels: data.length / 4,
      nonZeroPixels,
      fullyTransparentPixels,
      fullyOpaquePixels,
      colorRange: {
        red: { min: minR, max: maxR },
        green: { min: minG, max: maxG },
        blue: { min: minB, max: maxB },
        alpha: { min: minA, max: maxA },
      },
      hasVisibleContent: nonZeroPixels > 0 && maxA > 0,
    });

    // 保存前几个像素作为样本
    const samplePixels = [];
    for (let i = 0; i < Math.min(10, data.length / 4); i++) {
      const offset = i * 4;
      samplePixels.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        a: data[offset + 3],
      });
    }
    console.log("前10个像素样本:", samplePixels);
  }

  private fixWindowsImageData(data: Uint8ClampedArray): Uint8ClampedArray {
    // Windows特定的数据修复
    // const expectedLength = width * height * 4;

    // 检查是否是BGRA格式（Windows常见）
    let isBGRA = false;
    let hasContent = false;
    let allTransparent = true;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // 检查是否有内容（RGB通道）
      if (r > 0 || g > 0 || b > 0) {
        hasContent = true;
      }

      // 检查是否所有alpha都为0
      if (a > 0) {
        allTransparent = false;
      }

      // 简单的BGRA检测（如果B值明显高于R，可能是BGRA）
      if (b > r * 2 && b > 100) {
        isBGRA = true;
      }
    }

    console.log("数据格式检测:", { isBGRA, hasContent, allTransparent });

    const fixedData = new Uint8ClampedArray(data);

    // 1. 首先处理BGRA转RGBA
    if (isBGRA) {
      console.log("检测到BGRA格式，转换为RGBA");
      for (let i = 0; i < fixedData.length; i += 4) {
        // 交换R和B通道
        const r = fixedData[i];
        const b = fixedData[i + 2];
        fixedData[i] = b;
        fixedData[i + 2] = r;
      }
    }

    // 2. 关键修复：如果所有alpha为0但有RGB内容，设置alpha为255
    if (allTransparent && hasContent) {
      console.log("检测到所有alpha为0但有RGB内容，修复alpha通道");
      for (let i = 0; i < fixedData.length; i += 4) {
        const r = fixedData[i];
        const g = fixedData[i + 1];
        const b = fixedData[i + 2];

        // 如果有RGB内容，设置alpha为255（完全不透明）
        if (r > 0 || g > 0 || b > 0) {
          fixedData[i + 3] = 255;
        }
      }
    }

    return fixedData;
  }

  private async processImageWindowsCompat() {
    // Windows特定的兼容处理
    const image = await readImage();
    console.log("Windows兼容模式 - 读取到剪贴板图片:", image);

    const imageData = await image.rgba();
    const { width, height } = await image.size();

    console.log("Windows兼容模式 - 图片信息:", { width, height, dataLength: imageData.length });

    if (width === 0 || height === 0) {
      console.warn("Windows兼容模式 - 图片尺寸为0，无法处理");
      return;
    }

    // 使用更保守的数据处理方式
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 强制转换数据格式
    let processedData: Uint8ClampedArray;
    try {
      processedData = new Uint8ClampedArray(imageData);
    } catch (e) {
      console.warn("Windows兼容模式 - 数据转换失败，使用空数据填充", e);
      processedData = new Uint8ClampedArray(width * height * 4);
    }

    // 确保数据长度正确
    const expectedLength = width * height * 4;
    if (processedData.length !== expectedLength) {
      console.warn(`Windows兼容模式 - 修复数据长度: 期望 ${expectedLength}, 实际 ${processedData.length}`);
      const fixedData = new Uint8ClampedArray(expectedLength);
      fixedData.set(processedData.slice(0, Math.min(processedData.length, expectedLength)));
      processedData = fixedData;
    }

    // 检查并修复透明数据
    const hasNonTransparentPixels = processedData.some(
      (byte, index) => index % 4 === 3 && byte > 0, // 检查alpha通道
    );

    if (!hasNonTransparentPixels) {
      console.warn("Windows兼容模式 - 所有像素都是透明的，设置默认不透明");
      // 设置所有alpha通道为不透明
      for (let i = 3; i < processedData.length; i += 4) {
        processedData[i] = 255;
      }
    }

    const canvasImageData = new ImageData(Uint8ClampedArray.from(processedData), width, height);
    ctx.putImageData(canvasImageData, 0, 0);

    const blob = await this.createBlobFromCanvas(canvas);

    this.copyEnginePasteImage(blob);
  }

  private ensureImageDataFormat(data: any, width: number, height: number): Uint8ClampedArray {
    const expectedLength = width * height * 4;

    if (data instanceof Uint8ClampedArray) {
      // 检查长度是否匹配
      if (data.length === expectedLength) {
        return data;
      } else {
        console.warn(`数据长度不匹配: ${data.length} vs ${expectedLength}`);
        // 尝试修复长度
        const fixedData = new Uint8ClampedArray(expectedLength);
        fixedData.set(data.slice(0, Math.min(data.length, expectedLength)));
        return fixedData;
      }
    } else if (data instanceof Uint8Array) {
      // 转换为Uint8ClampedArray
      return new Uint8ClampedArray(data);
    } else if (data instanceof ArrayBuffer) {
      // 处理ArrayBuffer
      return new Uint8ClampedArray(data);
    } else {
      console.warn("未知数据类型，尝试转换:", data.constructor.name);
      return new Uint8ClampedArray(data);
    }
  }

  private validateCanvasContent(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const validationData = ctx.getImageData(0, 0, width, height);
    const data = validationData.data;

    let nonTransparentPixels = 0;
    let nonBlackPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) {
        nonTransparentPixels++;
      }

      if (r > 0 || g > 0 || b > 0) {
        nonBlackPixels++;
      }
    }

    const transparencyRatio = nonTransparentPixels / totalPixels;
    const colorRatio = nonBlackPixels / totalPixels;

    console.log("图片内容验证:", {
      totalPixels,
      nonTransparentPixels,
      nonBlackPixels,
      transparencyRatio: Math.round(transparencyRatio * 100) + "%",
      colorRatio: Math.round(colorRatio * 100) + "%",
      isEmpty: transparencyRatio < 0.01 && colorRatio < 0.01,
    });

    if (transparencyRatio < 0.01 && colorRatio < 0.01) {
      console.warn("图片内容为空，可能是透明图片");
    } else if (transparencyRatio < 0.1) {
      console.log("图片大部分区域透明，但有内容");
    } else {
      console.log("图片内容正常");
    }
  }

  private async createBlobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    // 在创建blob之前，先验证canvas内容
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 保存canvas内容用于调试
    const dataURL = canvas.toDataURL("image/png");
    console.log("Canvas数据URL预览:", dataURL.substring(0, 100) + "...");

    // 检查是否有实际内容
    let hasRealContent = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a > 0 && (r > 0 || g > 0 || b > 0)) {
        hasRealContent = true;
        break;
      }
    }

    console.log("Canvas内容检查结果:", { hasRealContent, width: canvas.width, height: canvas.height });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("canvas.toBlob返回null");
          reject(new Error("canvas.toBlob返回null"));
        } else {
          console.log("成功创建blob:", {
            type: blob.type,
            size: blob.size,
            hasContent: blob.size > 0,
            hasRealContent,
          });

          // 如果blob有内容但看起来是空的，可能有问题
          if (blob.size > 0 && !hasRealContent) {
            console.warn("警告：创建了非空blob但canvas内容看起来为空");
          }

          resolve(blob);
        }
      }, "image/png");
    });
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
      entity.move(
        new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
      );
    } else if (isMermaidGraphString(item)) {
      // 是Mermaid图表类型
      entity = new TextNode(this.project, {
        text: "mermaid图表，目前暂不支持",
        // details: "```mermaid\n" + item + "\n```",
        collisionBox,
      });
    } else {
      const { valid, text, url } = PathString.isMarkdownUrl(item);
      if (valid) {
        // 是Markdown链接类型
        // [text](https://www.example.text.com)
        entity = new UrlNode(this.project, {
          title: text,
          uuid: crypto.randomUUID(),
          url: url,
          collisionBox: new CollisionBox([
            new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
          ]),
        });
        entity.move(
          new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
        );
      } else {
        // 只是普通的文本
        if (item.length > 3000) {
          entity = new TextNode(this.project, {
            text: "粘贴板文字过长（超过3000字符），已写入节点详细信息",
            collisionBox,
            // [ { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
            details: item.split("\n").map((line) => ({ type: "p", children: [{ text: line }] })),
          });
        } else {
          entity = new TextNode(this.project, {
            text: item,
            collisionBox,
          });
          entity.move(
            new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
          );
        }
      }
    }

    if (entity !== null) {
      this.project.stageManager.add(entity);
      // 添加到section

      const mouseSections = this.project.sectionMethods.getSectionsByInnerLocation(
        this.project.renderer.transformView2World(MouseLocation.vector()),
      );

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
      collisionBox: new CollisionBox([
        new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
      ]),
    });
    this.project.stageManager.add(imageNode);
    // 图片的更新碰撞箱是 异步的，先不移动了。
    // imageNode.move(
    //   new Vector(-imageNode.collisionBox.getRectangle().width / 2, -imageNode.collisionBox.getRectangle().height / 2),
    // );
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
