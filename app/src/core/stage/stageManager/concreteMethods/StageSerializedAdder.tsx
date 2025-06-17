import { v4 as uuidv4 } from "uuid";
import { Serialized } from "../../../../types/node";
import { Vector } from "../../../dataStruct/Vector";
import { LineEdge } from "../../stageObject/association/LineEdge";
import { ConnectPoint } from "../../stageObject/entity/ConnectPoint";
import { TextNode } from "../../stageObject/entity/TextNode";
import { StageManager } from "../StageManager";
import { Section } from "../../stageObject/entity/Section";
import { PortalNode } from "../../stageObject/entity/PortalNode";
import { PenStroke } from "../../stageObject/entity/PenStroke";
import { UrlNode } from "../../stageObject/entity/UrlNode";
import { Entity } from "../../stageObject/abstract/StageEntity";
import { CubicCatmullRomSplineEdge } from "../../stageObject/association/CubicCatmullRomSplineEdge";
import { ImageNode } from "../../stageObject/entity/ImageNode";
import { SvgNode } from "../../stageObject/entity/SvgNode";
/**
 * 直接向舞台中添加序列化数据
 * 用于向舞台中附加新文件图、或者用于复制粘贴、甚至撤销
 */
export namespace StageSerializedAdder {
  /**
   * 将一个序列化信息加入舞台中
   * 会自动刷新新增部分的uuid
   * @param serializedData
   */
  export function addSerializedData(serializedData: Serialized.File, diffLocation = new Vector(0, 0)) {
    const updatedSerializedData = refreshUUID(serializedData);
    // TODO: 结构有待优化
    for (const entity of updatedSerializedData.entities) {
      let entityObject: Entity | null = null;
      if (Serialized.isTextNode(entity)) {
        entityObject = new TextNode(entity);
      } else if (Serialized.isSection(entity)) {
        entityObject = new Section(entity);
      } else if (Serialized.isConnectPoint(entity)) {
        entityObject = new ConnectPoint(entity);
      } else if (Serialized.isPenStroke(entity)) {
        entityObject = new PenStroke(entity);
      } else if (Serialized.isPortalNode(entity)) {
        entityObject = new PortalNode(entity);
      } else if (Serialized.isUrlNode(entity)) {
        entityObject = new UrlNode(entity);
      } else if (Serialized.isImageNode(entity)) {
        entityObject = new ImageNode(entity);
      } else if (Serialized.isSvgNode(entity)) {
        entityObject = new SvgNode(entity);
      }
      if (entityObject) {
        entityObject.moveTo(entityObject.collisionBox.getRectangle().location.add(diffLocation));
        StageManager.addEntity(entityObject);
      }
    }
    for (const edge of updatedSerializedData.associations) {
      if (Serialized.isLineEdge(edge)) {
        StageManager.addLineEdge(new LineEdge(edge));
      } else if (Serialized.isCubicCatmullRomSplineEdge(edge)) {
        StageManager.addCrEdge(new CubicCatmullRomSplineEdge(edge));
      }
    }
    StageManager.updateReferences();
  }

  /**
   * 优化的深拷贝函数，避免 JSON.parse(JSON.stringify) 的性能问题
   */
  function optimizedDeepCopy(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Array) {
      return obj.map((item) => optimizedDeepCopy(item));
    }

    const copy: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = optimizedDeepCopy(obj[key]);
      }
    }
    return copy;
  }

  function refreshUUID(serializedData: Serialized.File): Serialized.File {
    // 使用优化的深拷贝替代 JSON.parse(JSON.stringify)
    const result: Serialized.File = optimizedDeepCopy(serializedData);

    // 创建 UUID 映射表，避免重复查找
    const uuidMap = new Map<string, string>();

    // 预先生成所有新的 UUID
    for (const entity of result.entities) {
      uuidMap.set(entity.uuid, uuidv4());
    }

    // 批量更新实体 UUID
    for (const entity of result.entities) {
      entity.uuid = uuidMap.get(entity.uuid)!;
    }

    // 批量更新边的 UUID 引用
    for (const edge of result.associations) {
      if (Serialized.isEdge(edge)) {
        if (uuidMap.has(edge.source)) {
          edge.source = uuidMap.get(edge.source)!;
        }
        if (uuidMap.has(edge.target)) {
          edge.target = uuidMap.get(edge.target)!;
        }
      }
    }

    // 更新Section父子关系的UUID引用
    for (const [oldUUID, newUUID] of uuidMap.entries()) {
      for (const section of result.entities) {
        if (Serialized.isSection(section)) {
          if (section.children.includes(oldUUID)) {
            section.children = section.children.map((child) => (child === oldUUID ? newUUID : child));
          }
        }
      }
    }

    // 刷新边的UUID
    for (const edge of result.associations) {
      edge.uuid = uuidv4();
      // HACK: 以后出了关系的关系，就要再分类了
    }
    return result;
  }
}
