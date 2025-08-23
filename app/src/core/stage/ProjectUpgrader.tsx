import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { FixedToolbarKit } from "@/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { Serialized } from "@/types/node";
import { Path } from "@/utils/path";
import { MarkdownPlugin } from "@platejs/markdown";
import { readFile } from "@tauri-apps/plugin-fs";
import { createPlateEditor } from "platejs/react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { v4 as uuidv4 } from "uuid";
import { URI } from "vscode-uri";
import { PenStrokeSegment } from "./stageObject/entity/PenStroke";
import { Vector } from "@graphif/data-structures";

export namespace ProjectUpgrader {
  export function upgrade(data: Record<string, any>): Record<string, any> {
    data = convertV1toV2(data);
    data = convertV2toV3(data);
    data = convertV3toV4(data);
    data = convertV4toV5(data);
    data = convertV5toV6(data);
    data = convertV6toV7(data);
    data = convertV7toV8(data);
    data = convertV8toV9(data);
    data = convertV9toV10(data);
    data = convertV10toV11(data);
    data = convertV11toV12(data);
    data = convertV12toV13(data);
    data = convertV13toV14(data);
    data = convertV14toV15(data);
    data = convertV15toV16(data);
    data = convertV16toV17(data);
    return data;
  }

  function convertV1toV2(data: Record<string, any>): Record<string, any> {
    // 如果有version字段，说明数据是v2以上版本，不需要转换
    if ("version" in data) {
      return data;
    }
    data.version = 2;
    // 检查缺失的字段
    if (!("nodes" in data)) {
      data.nodes = [];
    }
    if (!("links" in data)) {
      data.links = [];
    }
    // 检查节点中缺失的字段
    for (const node of data.nodes) {
      if (!("details" in node)) {
        node.details = {};
      }
      if (!("inner_text" in node)) {
        node.inner_text = "";
      }
      if (!("children" in node)) {
        node.children = [];
      }
      if (!("uuid" in node)) {
        throw new Error("节点缺少uuid字段");
      }
    }
    for (const link of data.links) {
      if (!("inner_text" in link)) {
        link.inner_text = "";
      }
    }
    return data;
  }
  function convertV2toV3(data: Record<string, any>): Record<string, any> {
    if (data.version >= 3) {
      return data;
    }
    data.version = 3;
    // 重命名字段
    for (const node of data.nodes) {
      node.shape = node.body_shape;
      delete node.body_shape;
      node.shape.location = node.shape.location_left_top;
      delete node.shape.location_left_top;
      node.shape.size = [node.shape.width, node.shape.height];
      delete node.shape.width;
      delete node.shape.height;
      node.text = node.inner_text;
      delete node.inner_text;
    }
    data.edges = data.links;
    delete data.links;
    for (const edge of data.edges) {
      edge.source = edge.source_node;
      delete edge.source_node;
      edge.target = edge.target_node;
      delete edge.target_node;
      edge.text = edge.inner_text;
      delete edge.inner_text;
    }
    return data;
  }
  function convertV3toV4(data: Record<string, any>): Record<string, any> {
    if (data.version >= 4) {
      return data;
    }
    data.version = 4;
    for (const node of data.nodes) {
      node.color = [0, 0, 0, 0];
      node.location = node.shape.location;
      delete node.shape.location;
      node.size = node.shape.size;
      delete node.shape.size;
    }
    return data;
  }
  function convertV4toV5(data: Record<string, any>): Record<string, any> {
    if (data.version >= 5) {
      return data;
    }
    data.version = 5;
    for (const node of data.nodes) {
      if (!node.color) {
        node.color = [0, 0, 0, 0];
      }
    }
    return data;
  }

  // 继承体系重构，移除节点的 children字段
  function convertV5toV6(data: Record<string, any>): Record<string, any> {
    if (data.version >= 6) {
      return data;
    }
    data.version = 6;
    for (const node of data.nodes) {
      if (typeof node.children !== "undefined") {
        delete node.children;
      }
    }
    return data;
  }

  // 继承体系重构，Edge增加uuid字段
  function convertV6toV7(data: Record<string, any>): Record<string, any> {
    if (data.version >= 7) {
      return data;
    }
    data.version = 7;
    for (const edge of data.edges) {
      if (typeof edge.uuid === "undefined") {
        edge.uuid = uuidv4();
      }
    }
    return data;
  }

  // 继承体系重构，增加type
  function convertV7toV8(data: Record<string, any>): Record<string, any> {
    if (data.version >= 8) {
      return data;
    }
    data.version = 8;
    for (const node of data.nodes) {
      node.type = "core:text_node";
    }
    for (const edge of data.edges) {
      edge.type = "core:edge";
    }
    return data;
  }

  // 增加连接点 ConnectionPoint
  function convertV8toV9(data: Record<string, any>): Record<string, any> {
    if (data.version >= 9) {
      return data;
    }
    data.version = 9;
    return data;
  }

  // 增加tags
  function convertV9toV10(data: Record<string, any>): Record<string, any> {
    if (data.version >= 10) {
      return data;
    }
    data.version = 10;
    data.tags = [];
    return data;
  }

  // 所有实体都支持 details，不再仅仅是TextNode支持
  function convertV10toV11(data: Record<string, any>): Record<string, any> {
    if (data.version >= 11) {
      return data;
    }
    data.version = 11;
    for (const node of data.nodes) {
      if (node.type === "core:section") {
        // bug
        if (typeof node.details === "undefined") {
          node.details = "";
        }
      } else if (node.type === "core:connect_point") {
        // bug
        if (typeof node.details === "undefined") {
          node.details = "";
        }
      } else if (node.type === "core:image_node") {
        if (typeof node.details === "undefined") {
          node.details = "";
        }
      }
    }
    return data;
  }

  // 图片支持自定义缩放大小
  function convertV11toV12(data: Record<string, any>): Record<string, any> {
    if (data.version >= 12) {
      return data;
    }
    data.version = 12;
    for (const node of data.nodes) {
      if (node.type === "core:image_node") {
        if (typeof node.scale === "undefined") {
          node.scale = 1 / (window.devicePixelRatio || 1);
        }
      }
    }
    return data;
  }

  /**
   * node -> entities
   * edge -> associations
   * @param data
   * @returns
   */
  function convertV12toV13(data: Record<string, any>): Record<string, any> {
    if (data.version >= 13) {
      return data;
    }
    data.version = 13;
    if ("nodes" in data) {
      data.entities = data.nodes;
      delete data.nodes;
    }
    if ("edges" in data) {
      for (const edge of data.edges) {
        edge.type = "core:line_edge";
      }
      data.associations = data.edges;
      delete data.edges;
    }

    return data;
  }

  /**
   * Edge增加了颜色字段
   * @param data
   */
  function convertV13toV14(data: Record<string, any>): Record<string, any> {
    if (data.version >= 14) {
      return data;
    }
    data.version = 14;
    for (const edge of data.associations) {
      // edge.color = [0, 0, 0, 0];
      if (typeof edge.color === "undefined") {
        edge.color = [0, 0, 0, 0];
      }
    }
    return data;
  }

  /**
   * 涂鸦增加颜色字段
   * @param data
   */
  function convertV14toV15(data: Record<string, any>): Record<string, any> {
    if (data.version >= 15) {
      return data;
    }
    data.version = 15;
    for (const node of data.entities) {
      if (node.type === "core:pen_stroke") {
        if (typeof node.color === "undefined") {
          node.color = [0, 0, 0, 0];
        }
      }
    }
    return data;
  }

  /**
   * 文本节点增加自动转换大小/手动转换大小功能
   * @param data
   */
  function convertV15toV16(data: Record<string, any>): Record<string, any> {
    if (data.version >= 16) {
      return data;
    }
    data.version = 16;
    for (const node of data.entities) {
      if (node.type === "core:text_node") {
        if (typeof node.sizeAdjust === "undefined") {
          node.sizeAdjust = "auto";
        }
      }
    }
    return data;
  }

  /**
   * Edge连线接头增加比率字段
   * @param data
   */
  function convertV16toV17(data: Record<string, any>): Record<string, any> {
    if (data.version >= 17) {
      return data;
    }
    data.version = 17;
    for (const edge of data.associations) {
      if (Serialized.isEdge(edge) && edge.sourceRectRate === undefined && edge.targetRectRate === undefined) {
        edge.sourceRectRate = [0.5, 0.5];
        edge.targetRectRate = [0.5, 0.5];
      }
    }
    return data;
  }

  export async function convertVAnyToN1(json: Record<string, any>, uri: URI) {
    // 升级json数据到最新版本
    // json = ProjectUpgrader.upgrade(json);

    const uuidMap = new Map<string, Record<string, any>>();
    const resultStage: Record<string, any>[] = [];
    const attachments = new Map<string, Blob>();

    const basePath = new Path(uri.fsPath).parent;

    // Helper functions for repeated structures
    const toColor = (arr: number[]) => ({
      _: "Color",
      r: arr[0],
      g: arr[1],
      b: arr[2],
      a: arr[3],
    });
    const toVector = (arr: number[]) => ({
      _: "Vector",
      x: arr[0],
      y: arr[1],
    });
    const toDetails = (md: string) => {
      const editor = createPlateEditor({
        plugins: [
          ...FloatingToolbarKit,
          ...FixedToolbarKit,
          ...BasicMarksKit,
          ...BasicBlocksKit,
          ...FontKit,
          ...TableKit,
          ...MathKit,
          ...CodeBlockKit,
          ...ListKit,
          ...LinkKit,
          MarkdownPlugin,
        ],
      });
      const value = editor.api.markdown.deserialize(md, {
        remarkPlugins: [remarkGfm, remarkMath, remarkBreaks],
      });
      return value;
    };

    // Recursively convert all entities
    async function convertEntityVAnyToN1(
      entity: Record<string, any>,
      uuidMap: Map<string, Record<string, any>>,
      entities: Array<Record<string, any>>,
    ): Promise<Record<string, any> | undefined> {
      if (uuidMap.has(entity.uuid)) {
        return uuidMap.get(entity.uuid);
      }

      let data: Record<string, any> | undefined;

      switch (entity.type) {
        case "core:text_node": {
          data = {
            _: "TextNode",
            uuid: entity.uuid,
            text: entity.text,
            details: toDetails(entity.details),
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector(entity.size),
                },
              ],
            },
            color: toColor(entity.color),
            sizeAdjust: entity.sizeAdjust,
          };
          break;
        }
        case "core:section": {
          const children: Array<Record<string, any>> = [];
          if (entity.children) {
            for (const childUUID of entity.children) {
              let childData = uuidMap.get(childUUID);
              if (!childData) {
                const childEntity = entities.find((e) => e.uuid === childUUID);
                if (childEntity) {
                  childData = await convertEntityVAnyToN1(childEntity, uuidMap, entities);
                }
              }
              if (childData) {
                children.push(childData);
              }
            }
          }
          data = {
            _: "Section",
            uuid: entity.uuid,
            text: entity.text,
            details: toDetails(entity.details),
            isCollapsed: entity.isCollapsed,
            isHidden: entity.isHidden,
            children,
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector(entity.size),
                },
              ],
            },
            color: toColor(entity.color),
          };
          break;
        }
        case "core:pen_stroke": {
          // 涂鸦
          const segments: PenStrokeSegment[] = [];
          const stringParts = entity.content.split("~");
          for (const part of stringParts) {
            const [x, y, pressure] = part.split(",");
            const segment = new PenStrokeSegment(new Vector(Number(x), Number(y)), Number(pressure) / 5);
            segments.push(segment);
          }
          data = {
            _: "PenStroke",
            uuid: entity.uuid,
            color: toColor(entity.color),
            segments,
          };

          break;
        }
        case "core:image_node": {
          // 图片
          const path = entity.path;
          const imageContent = await readFile(basePath.join(path).toString());
          const blob = new Blob([imageContent], { type: "image/png" });
          const attachmentId = crypto.randomUUID();
          attachments.set(attachmentId, blob);
          data = {
            _: "ImageNode",
            uuid: entity.uuid,
            attachmentId,
            details: toDetails(entity.details),
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector(entity.size),
                },
              ],
            },
            scale: entity.scale || 1,
          };
          break;
        }
        case "core:connect_point": {
          // 连接点
          data = {
            _: "ConnectPoint",
            uuid: entity.uuid,
            details: toDetails(entity.details),
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector([1, 1]),
                },
              ],
            },
          };
          break;
        }
        case "core:url_node": {
          // 链接
          data = {
            _: "UrlNode",
            uuid: entity.uuid,
            title: entity.title,
            url: entity.url,
            details: toDetails(entity.details),
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector(entity.size),
                },
              ],
            },
            color: toColor(entity.color),
          };
          break;
        }
        case "core:portal_node": {
          // 传送门，先不管
          break;
        }
        case "core:svg_node": {
          // svg节点，和图片一样，要处理附件
          const code = entity.content;
          const attachmentId = crypto.randomUUID();
          const blob = new Blob([code], { type: "image/svg+xml" });
          attachments.set(attachmentId, blob);
          data = {
            _: "SvgNode",
            uuid: entity.uuid,
            attachmentId,
            details: toDetails(entity.details),
            collisionBox: {
              _: "CollisionBox",
              shapes: [
                {
                  _: "Rectangle",
                  location: toVector(entity.location),
                  size: toVector(entity.size),
                },
              ],
            },
            scale: entity.scale || 1,
            color: toColor(entity.color),
          };
          break;
        }
        default: {
          console.warn(`未知的实体类型${entity.type}`);
          break;
        }
      }

      if (data) {
        uuidMap.set(entity.uuid, data);
      }
      return data;
    }

    // Convert all top-level entities
    for (const entity of json.entities) {
      const data = await convertEntityVAnyToN1(entity, uuidMap, json.entities);
      if (data) {
        resultStage.push(data);
      }
    }

    // Convert associations
    for (const association of json.associations) {
      switch (association.type) {
        case "core:line_edge": {
          const fromNode = uuidMap.get(association.source);
          const toNode = uuidMap.get(association.target);

          if (!fromNode || !toNode) {
            // toast.warning(`边 ${association.uuid} 关联的节点不存在: ${association.source} -> ${association.target}`);
            continue;
          }

          resultStage.push({
            _: "LineEdge",
            uuid: association.uuid,
            associationList: [fromNode, toNode],
            text: association.text,
            color: toColor(association.color),
            sourceRectangleRate: toVector(association.sourceRectRate),
            targetRectangleRate: toVector(association.targetRectRate),
          });
          break;
        }
        case "core:cublic_catmull_rom_spline_edge": {
          // CR曲线
          break;
        }
        case "core:multi_target_undirected_edge": {
          // 多源无向边
          break;
        }
        default: {
          // 其他类型
          break;
        }
      }
    }

    // 遍历所有标签
    // TODO

    return { data: resultStage, attachments };
  }
}
