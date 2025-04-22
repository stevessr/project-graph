import { Serialized } from "../../../../types/node";
import { StringDict } from "../../dataStruct/StringDict";
import { Association } from "../stageObject/abstract/Association";
import { Entity } from "../stageObject/abstract/StageEntity";
import { CublicCatmullRomSplineEdge } from "../stageObject/association/CublicCatmullRomSplineEdge";
import { LineEdge } from "../stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "../stageObject/association/MutiTargetUndirectedEdge";
import { ConnectPoint } from "../stageObject/entity/ConnectPoint";
import { ImageNode } from "../stageObject/entity/ImageNode";
import { PenStroke } from "../stageObject/entity/PenStroke";
import { PortalNode } from "../stageObject/entity/PortalNode";
import { Section } from "../stageObject/entity/Section";
import { TextNode } from "../stageObject/entity/TextNode";
import { UrlNode } from "../stageObject/entity/UrlNode";

type StageContent = {
  entities: StringDict<Entity>;
  associations: StringDict<Association>;
  tags: string[];
};

/**
 * 获取舞台的序列化状态
 * @param stageContent 舞台内容数据
 * @returns 序列化状态的 JSON 字符串
 */
export function getSerializedState(stageContent: StageContent): string {
  const serializedEntities: (
    | Serialized.TextNode
    | Serialized.Section
    | Serialized.ConnectPoint
    | Serialized.ImageNode
    | Serialized.UrlNode
    | Serialized.PenStroke
    | Serialized.PortalNode
  )[] = [];
  for (const entity of stageContent.entities.valuesToArray()) {
    // Convert entity to Serialized type - This requires implementing conversion logic for each entity type
    // For simplicity, let's assume a basic conversion for now.
    // A proper implementation would need to handle all properties and types defined in Serialized.
    if (entity instanceof TextNode) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:text_node",
        location: [entity.rectangle.location.x, entity.rectangle.location.y],
        details: entity.details,
        size: [entity.rectangle.size.x, entity.rectangle.size.y],
        text: entity.text,
        color: entity.color.toArray(),
        sizeAdjust: entity.sizeAdjust,
      });
    } else if (entity instanceof Section) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:section",
        location: [entity.rectangle.location.x, entity.rectangle.location.y],
        details: entity.details,
        size: [entity.rectangle.size.x, entity.rectangle.size.y],
        text: entity.text,
        color: entity.color.toArray(),
        children: entity.childrenUUIDs,
        isHidden: entity.isHidden,
        isCollapsed: entity.isCollapsed,
      });
    } else if (entity instanceof ConnectPoint) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:connect_point",
        location: [entity.geometryCenter.x, entity.geometryCenter.y],
        details: entity.details,
      });
    } else if (entity instanceof ImageNode) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:image_node",
        location: [entity.rectangle.location.x, entity.rectangle.location.y],
        details: entity.details,
        path: entity.path,
        size: [entity.rectangle.size.x, entity.rectangle.size.y],
        scale: entity.scaleNumber,
      });
    } else if (entity instanceof UrlNode) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:url_node",
        location: [entity.rectangle.location.x, entity.rectangle.location.y],
        details: entity.details,
        url: entity.url,
        title: entity.title,
        size: [entity.rectangle.size.x, entity.rectangle.size.y],
        color: entity.color.toArray(),
      });
    } else if (entity instanceof PenStroke) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:pen_stroke",
        location: [entity.collisionBox.getRectangle().location.x, entity.collisionBox.getRectangle().location.y],
        details: entity.details,
        content: entity.dumpString(),
        color: entity.getColor().toArray(),
      });
    } else if (entity instanceof PortalNode) {
      serializedEntities.push({
        uuid: entity.uuid,
        type: "core:portal_node",
        location: [entity.location.x, entity.location.y], // Access via getter
        details: entity.details,
        portalFilePath: entity.portalFilePath,
        targetLocation: [entity.targetLocation.x, entity.targetLocation.y],
        cameraScale: entity.cameraScale,
        title: entity.title,
        size: [entity.size.x, entity.size.y], // Public property
        color: entity.color.toArray(),
      });
    }
  }

  const serializedAssociations: (
    | Serialized.LineEdge
    | Serialized.CublicCatmullRomSplineEdge
    | Serialized.MultiTargetUndirectedEdge
  )[] = [];
  for (const association of stageContent.associations.valuesToArray()) {
    // Convert association to Serialized type
    if (association instanceof LineEdge) {
      serializedAssociations.push({
        uuid: association.uuid,
        type: "core:line_edge",
        source: association.source.uuid,
        target: association.target.uuid,
        text: association.text,
        color: association.color.toArray(),
        sourceRectRate: association.sourceRectangleRate.toArray(),
        targetRectRate: association.targetRectangleRate.toArray(),
      });
    } else if (association instanceof CublicCatmullRomSplineEdge) {
      serializedAssociations.push({
        uuid: association.uuid,
        type: "core:cublic_catmull_rom_spline_edge",
        source: association.source.uuid,
        target: association.target.uuid,
        text: association.text,
        controlPoints: association.getControlPoints().map((p) => p.toArray()),
        alpha: association.alpha,
        tension: association.tension,
        sourceRectRate: association.sourceRectangleRate.toArray(),
        targetRectRate: association.targetRectangleRate.toArray(),
      });
    } else if (association instanceof MultiTargetUndirectedEdge) {
      serializedAssociations.push({
        uuid: association.uuid,
        type: "core:multi_target_undirected_edge",
        text: association.text,
        targets: association.targetUUIDs,
        color: association.color.toArray(),
        rectRates: association.rectRates.map((r) => r.toArray()),
      });
    }
  }

  const serializedFile: Serialized.File = {
    version: 17, // Assuming latest version based on StageLoader
    entities: serializedEntities,
    associations: serializedAssociations,
    tags: stageContent.tags,
  };

  return JSON.stringify(serializedFile);
}
