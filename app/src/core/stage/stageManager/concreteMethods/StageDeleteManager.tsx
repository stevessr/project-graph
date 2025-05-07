import { Color } from "../../../dataStruct/Color";
import { ProgressNumber } from "../../../dataStruct/ProgressNumber";
import { ExplodeDashEffect } from "../../../service/feedbackService/effectEngine/concrete/ExplodeDashEffect";
import { Stage } from "../../Stage";
import { Association } from "../../stageObject/abstract/Association";
import { Entity } from "../../stageObject/abstract/StageEntity";
import { Edge } from "../../stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "../../stageObject/association/MutiTargetUndirectedEdge";
import { ConnectPoint } from "../../stageObject/entity/ConnectPoint";
import { ImageNode } from "../../stageObject/entity/ImageNode";
import { PenStroke } from "../../stageObject/entity/PenStroke";
import { PortalNode } from "../../stageObject/entity/PortalNode";
import { Section } from "../../stageObject/entity/Section";
import { SvgNode } from "../../stageObject/entity/SvgNode";
import { TextNode } from "../../stageObject/entity/TextNode";
import { UrlNode } from "../../stageObject/entity/UrlNode";
import { SectionMethods } from "../basicMethods/SectionMethods";
import { StageSectionInOutManager } from "./StageSectionInOutManager";

/**
 * 包含一切删除舞台上的元素的方法
 */
export namespace StageDeleteManager {
  export function deleteEntities(deleteNodes: Entity[]) {
    // TODO: 这里应该优化，否则每次新加内容就得些一个类型判断
    for (const entity of deleteNodes) {
      if (entity instanceof TextNode) {
        deleteTextNode(entity);
      } else if (entity instanceof Section) {
        deleteSection(entity);
      } else if (entity instanceof ConnectPoint) {
        deleteConnectPoint(entity);
      } else if (entity instanceof ImageNode) {
        deleteImageNode(entity);
      } else if (entity instanceof UrlNode) {
        deleteUrlNode(entity);
      } else if (entity instanceof PortalNode) {
        deletePortalNode(entity);
      } else if (entity instanceof PenStroke) {
        deletePenStroke(entity);
      } else if (entity instanceof SvgNode) {
        deleteSvgNode(entity);
      }
    }
    // StageManager.updateReferences();
  }

  function deleteSvgNode(entity: SvgNode) {
    if (Stage.stageManager.getEntities().includes(entity)) {
      Stage.stageManager.deleteOneEntity(entity);
      // 删除所有相关的边
      deleteEntityAfterClearAssociation(entity);
    }
  }

  function deletePortalNode(entity: PortalNode) {
    if (Stage.stageManager.getPortalNodes().includes(entity)) {
      Stage.stageManager.deleteOnePortalNode(entity);
      // 删除所有相关的边
      deleteEntityAfterClearAssociation(entity);
    }
  }

  function deletePenStroke(penStroke: PenStroke) {
    if (Stage.stageManager.getPenStrokes().includes(penStroke)) {
      Stage.stageManager.deleteOnePenStroke(penStroke);
    }
  }

  function deleteSection(entity: Section) {
    if (!Stage.stageManager.getSections().includes(entity)) {
      console.warn("section not in sections!!!", entity.uuid);
      return;
    }

    // 先删除所有内部的东西
    if (entity.isCollapsed) {
      deleteEntities(entity.children);
    }

    // 再删除自己
    Stage.stageManager.deleteOneSection(entity);
    deleteEntityAfterClearAssociation(entity);
    // 将自己所有的父级Section的children添加自己的children
    const fatherSections = SectionMethods.getFatherSections(entity);
    StageSectionInOutManager.goInSections(entity.children, fatherSections);
  }
  function deleteImageNode(entity: ImageNode) {
    if (Stage.stageManager.getImageNodes().includes(entity)) {
      Stage.stageManager.deleteOneImage(entity);
      Stage.effectMachine.addEffect(
        new ExplodeDashEffect(new ProgressNumber(0, 30), entity.collisionBox.getRectangle(), Color.White),
      );
      // 删除所有相关的边
      deleteEntityAfterClearAssociation(entity);
    }
  }
  function deleteUrlNode(entity: UrlNode) {
    if (Stage.stageManager.getUrlNodes().includes(entity)) {
      Stage.stageManager.deleteOneUrlNode(entity);
      // 删除所有相关的边
      deleteEntityAfterClearAssociation(entity);
    }
  }

  function deleteConnectPoint(entity: ConnectPoint) {
    // 先判断这个node是否在nodes里
    if (Stage.stageManager.getConnectPoints().includes(entity)) {
      // 从数组中去除
      Stage.stageManager.deleteOneConnectPoint(entity);
      Stage.effectMachine.addEffect(
        new ExplodeDashEffect(new ProgressNumber(0, 30), entity.collisionBox.getRectangle(), Color.White),
      );
      // 删除所有相关的边
      deleteEntityAfterClearAssociation(entity);
    } else {
      console.warn("connect point not in connect points", entity.uuid);
    }
  }

  function deleteTextNode(entity: TextNode) {
    // 先判断这个node是否在nodes里
    if (Stage.stageManager.getTextNodes().includes(entity)) {
      // 从数组中去除
      Stage.stageManager.deleteOneTextNode(entity);
      // 增加特效
      Stage.effectMachine.addEffect(
        new ExplodeDashEffect(
          new ProgressNumber(0, 30),
          entity.collisionBox.getRectangle(),
          entity.color.a === 0 ? Color.White : entity.color.clone(),
        ),
      );
    } else {
      console.warn("node not in nodes", entity.uuid);
    }
    // 删除所有相关的边
    deleteEntityAfterClearAssociation(entity);
  }

  /**
   * 删除所有相关的边
   * @param entity
   */
  function deleteEntityAfterClearAssociation(entity: Entity) {
    const prepareDeleteAssociation: Association[] = [];
    const visitedAssociations: Set<string> = new Set();

    for (const edge of Stage.stageManager.getAssociations()) {
      if (edge instanceof Edge) {
        if ((edge.source === entity || edge.target === entity) && visitedAssociations.has(edge.uuid) === false) {
          prepareDeleteAssociation.push(edge);
          visitedAssociations.add(edge.uuid);
        }
      } else if (edge instanceof MultiTargetUndirectedEdge) {
        if (edge.targetUUIDs.includes(entity.uuid) && visitedAssociations.has(edge.uuid) === false) {
          prepareDeleteAssociation.push(edge);
          visitedAssociations.add(edge.uuid);
        }
      }
    }
    for (const edge of prepareDeleteAssociation) {
      Stage.stageManager.deleteOneAssociation(edge);
    }
  }

  /**
   * 注意不要在遍历edges数组中调用这个方法，否则会导致数组长度变化，导致索引错误
   * @param deleteEdge 要删除的边
   * @returns
   */
  export function deleteEdge(deleteEdge: Edge): boolean {
    const fromNode = deleteEdge.source;
    const toNode = deleteEdge.target;
    // 先判断这两个节点是否在nodes里
    if (Stage.stageManager.isEntityExists(fromNode.uuid) && Stage.stageManager.isEntityExists(toNode.uuid)) {
      // 删除边
      Stage.stageManager.deleteOneAssociation(deleteEdge);
      Stage.stageManager.updateReferences();
      return true;
    } else {
      return false;
    }
  }

  export function deleteMultiTargetUndirectedEdge(edge: MultiTargetUndirectedEdge) {
    Stage.stageManager.deleteOneAssociation(edge);
    Stage.stageManager.updateReferences();
    return true;
  }
}
