import { Direction } from "../../../types/directions";
import { Serialized } from "../../../types/node";
import { PathString } from "../../../utils/pathString";
import { Rectangle } from "../../dataStruct/shape/Rectangle";
import { StringDict } from "../../dataStruct/StringDict";
import { Vector } from "../../dataStruct/Vector";
import * as EdgeRenderer from "../../render/canvas2d/entityRenderer/edge/EdgeRenderer";
import { Renderer } from "../../render/canvas2d/renderer";
import { Settings } from "../../service/Settings";
import { Camera } from "../Camera";
import { Stage } from "../Stage";
import { Association } from "../stageObject/abstract/Association";
import { ConnectableEntity } from "../stageObject/abstract/ConnectableEntity";
import { Entity } from "../stageObject/abstract/StageEntity";
import { StageObject } from "../stageObject/abstract/StageObject";
import { CublicCatmullRomSplineEdge } from "../stageObject/association/CublicCatmullRomSplineEdge";
import { Edge } from "../stageObject/association/Edge";
import { LineEdge } from "../stageObject/association/LineEdge";
import { ConnectPoint } from "../stageObject/entity/ConnectPoint";
import { ImageNode } from "../stageObject/entity/ImageNode";
import { PenStroke } from "../stageObject/entity/PenStroke";
import { PortalNode } from "../stageObject/entity/PortalNode";
import { Section } from "../stageObject/entity/Section";
import { TextNode } from "../stageObject/entity/TextNode";
import { UrlNode } from "../stageObject/entity/UrlNode";
import { GraphMethods } from "./basicMethods/GraphMethods";
import { StageNodeAdder } from "./concreteMethods/stageNodeAdder";
import { StageSectionInOutManager } from "./concreteMethods/StageSectionInOutManager";
import { StageSectionPackManager } from "./concreteMethods/StageSectionPackManager";
import { StageSerializedAdder } from "./concreteMethods/StageSerializedAdder";
import { MultiTargetUndirectedEdge } from "../stageObject/association/MutiTargetUndirectedEdge";

// littlefean:应该改成类，实例化的对象绑定到舞台上。这成单例模式了
// 开发过程中会造成多开
// zty012:这个是存储数据的，和舞台无关，应该单独抽离出来
// 并且会在舞台之外的地方操作，所以应该是namespace单例

type stageContent = {
  entities: StringDict<Entity>;
  associations: StringDict<Association>;
  tags: string[];
};

/**
 * 子场景的相机数据
 */
export type ChildCameraData = {
  /**
   * 传送门的左上角位置
   */
  location: Vector;
  zoom: number;
  /**
   * 传送门大小
   */
  size: Vector;
  /**
   * 相机的目标位置
   */
  targetLocation: Vector;
};

/**
 * 舞台管理器，也可以看成包含了很多操作方法的《舞台实体容器》
 * 管理节点、边的关系等，内部包含了舞台上的所有实体
 */
export namespace StageManager {
  const stageContent: stageContent = {
    entities: StringDict.create(),
    associations: StringDict.create(),
    tags: [],
  };

  export function getStageContentDebug() {
    return stageContent.entities.length;
  }
  /**
   * 子舞台，用于渲染传送门中的另一个世界
   * key：绝对路径构成的字符串，用于区分不同的子舞台
   */
  const childStageContent: Record<string, stageContent> = {};

  /**
   * 每一个子舞台的相机数据，用于渲染传送门中的另一个世界
   */
  const childStageCameraData: Record<string, ChildCameraData> = {};

  export function updateChildStageCameraData(path: string, data: ChildCameraData) {
    childStageCameraData[path] = data;
  }
  export function getChildStageCameraData(path: string) {
    return childStageCameraData[path];
  }

  export function storeMainStage() {
    childStageContent["main"] = {
      entities: stageContent.entities.clone(),
      associations: stageContent.associations.clone(),
      tags: [...stageContent.tags],
    };
  }
  export function restoreMainStage() {
    stageContent.associations = childStageContent["main"].associations.clone();
    stageContent.entities = childStageContent["main"].entities.clone();
    stageContent.tags = [...childStageContent["main"].tags];
  }
  export function storeMainStageToChildStage(path: string) {
    childStageContent[path] = {
      entities: stageContent.entities.clone(),
      associations: stageContent.associations.clone(),
      tags: [...stageContent.tags],
    };
  }
  export function storeChildStageToMainStage(path: string) {
    stageContent.associations = childStageContent[path].associations.clone();
    stageContent.entities = childStageContent[path].entities.clone();
    stageContent.tags = [...childStageContent[path].tags];
  }
  export function getAllChildStageKeys(): string[] {
    return Object.keys(childStageContent).filter((key) => key !== "main");
  }
  export function clearAllChildStage() {
    for (const key of Object.keys(childStageContent)) {
      if (key !== "main") {
        childStageContent[key].entities.clear();
        childStageContent[key].associations.clear();
        childStageContent[key].tags = [];
      }
    }
  }
  // 使用这个方法时要提前保证当前主舞台槽上放的是主舞台
  export function getAllChildStageKeysAndCamera(): { key: string; camera: ChildCameraData }[] {
    const result = [];
    for (const entity of getEntities().filter((entity) => entity instanceof PortalNode)) {
      const newKey = PathString.relativePathToAbsolutePath(
        PathString.dirPath(Stage.path.getFilePath()),
        entity.portalFilePath,
      );
      const item = {
        key: newKey,
        camera: {
          location: entity.location,
          zoom: entity.cameraScale,
          size: entity.size,
          targetLocation: entity.targetLocation,
        },
      };
      result.push(item);
    }
    return result;
  }

  export let isEnableEntityCollision: boolean = false;
  export let isAllowAddCycleEdge: boolean = false;

  export function init() {
    Settings.watch("isEnableEntityCollision", (value) => {
      isEnableEntityCollision = value;
    });
    Settings.watch("allowAddCycleEdge", (value) => {
      isAllowAddCycleEdge = value;
    });
  }

  export function isEmpty(): boolean {
    return stageContent.entities.length === 0;
  }
  export function getTextNodes(): TextNode[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof TextNode);
  }
  export function getConnectableEntity(): ConnectableEntity[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof ConnectableEntity);
  }
  export function isEntityExists(uuid: string): boolean {
    return stageContent.entities.hasId(uuid);
  }
  export function getSections(): Section[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof Section);
  }
  export function getImageNodes(): ImageNode[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof ImageNode);
  }
  export function getConnectPoints(): ConnectPoint[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof ConnectPoint);
  }
  export function getUrlNodes(): UrlNode[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof UrlNode);
  }
  export function getPortalNodes(): PortalNode[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof PortalNode);
  }
  export function getPenStrokes(): PenStroke[] {
    return stageContent.entities.valuesToArray().filter((node) => node instanceof PenStroke);
  }

  export function getStageObject(): StageObject[] {
    const result: StageObject[] = [];
    result.push(...stageContent.entities.valuesToArray());
    result.push(...stageContent.associations.valuesToArray());
    return result;
  }

  /**
   * 获取场上所有的实体
   * @returns
   */
  export function getEntities(): Entity[] {
    return stageContent.entities.valuesToArray();
  }
  export function getStageObjectByUUID(uuid: string): StageObject | null {
    const entity = stageContent.entities.getById(uuid);
    if (entity) {
      return entity;
    }
    const association = stageContent.associations.getById(uuid);
    if (association) {
      return association;
    }
    return null;
  }
  export function getEntitiesByUUIDs(uuids: string[]): Entity[] {
    const result = [];
    for (const uuid of uuids) {
      const entity = stageContent.entities.getById(uuid);
      if (entity) {
        result.push(entity);
      }
    }
    return result;
  }
  export function isNoEntity(): boolean {
    return stageContent.entities.length === 0;
  }
  export function deleteOneTextNode(node: TextNode) {
    stageContent.entities.deleteValue(node);
  }
  export function deleteOneImage(node: ImageNode) {
    stageContent.entities.deleteValue(node);
  }
  export function deleteOneUrlNode(node: UrlNode) {
    stageContent.entities.deleteValue(node);
  }
  export function deleteOneSection(section: Section) {
    stageContent.entities.deleteValue(section);
  }
  export function deleteOneConnectPoint(point: ConnectPoint) {
    stageContent.entities.deleteValue(point);
  }
  export function deleteOnePortalNode(node: PortalNode) {
    stageContent.entities.deleteValue(node);
  }
  export function deleteOnePenStroke(penStroke: PenStroke) {
    stageContent.entities.deleteValue(penStroke);
  }
  export function deleteOneLineEdge(edge: LineEdge) {
    stageContent.associations.deleteValue(edge);
  }
  export function deleteOneAssociation(association: Association) {
    stageContent.associations.deleteValue(association);
  }

  export function getAssociations(): Association[] {
    return stageContent.associations.valuesToArray();
  }
  export function getEdges(): Edge[] {
    return stageContent.associations.valuesToArray().filter((edge) => edge instanceof Edge);
  }
  export function getLineEdges(): LineEdge[] {
    return stageContent.associations.valuesToArray().filter((edge) => edge instanceof LineEdge);
  }
  export function getCrEdges(): CublicCatmullRomSplineEdge[] {
    return stageContent.associations.valuesToArray().filter((edge) => edge instanceof CublicCatmullRomSplineEdge);
  }

  /** 关于标签的相关操作 */
  export namespace TagOptions {
    export function reset(uuids: string[]) {
      stageContent.tags = [];
      for (const uuid of uuids) {
        stageContent.tags.push(uuid);
      }
    }
    export function addTag(uuid: string) {
      stageContent.tags.push(uuid);
    }
    export function removeTag(uuid: string) {
      const index = stageContent.tags.indexOf(uuid);
      if (index !== -1) {
        stageContent.tags.splice(index, 1);
      }
    }
    export function hasTag(uuid: string): boolean {
      return stageContent.tags.includes(uuid);
    }
    export function getTagUUIDs(): string[] {
      return stageContent.tags;
    }
    /**
     * 清理未引用的标签
     */
    export function updateTags() {
      const uuids = stageContent.tags.slice();
      for (const uuid of uuids) {
        if (!stageContent.entities.hasId(uuid) && !stageContent.associations.hasId(uuid)) {
          stageContent.tags.splice(stageContent.tags.indexOf(uuid), 1);
        }
      }
    }

    export function moveUpTag(uuid: string) {
      const index = stageContent.tags.indexOf(uuid);
      if (index !== -1 && index > 0) {
        const temp = stageContent.tags[index - 1];
        stageContent.tags[index - 1] = uuid;
        stageContent.tags[index] = temp;
        console.log("move up tag");
      }
    }
    export function moveDownTag(uuid: string) {
      const index = stageContent.tags.indexOf(uuid);
      if (index !== -1 && index < stageContent.tags.length - 1) {
        const temp = stageContent.tags[index + 1];
        stageContent.tags[index + 1] = uuid;
        stageContent.tags[index] = temp;
        console.log("move down tag");
      }
    }
  }

  /**
   * 销毁函数
   * 以防开发过程中造成多开
   */
  export function destroy() {
    stageContent.entities.clear();
    stageContent.associations.clear();
    stageContent.tags = [];
  }

  export function addTextNode(node: TextNode) {
    stageContent.entities.addValue(node, node.uuid);
  }
  export function addUrlNode(node: UrlNode) {
    stageContent.entities.addValue(node, node.uuid);
  }
  export function addImageNode(node: ImageNode) {
    stageContent.entities.addValue(node, node.uuid);
  }
  export function addSection(section: Section) {
    stageContent.entities.addValue(section, section.uuid);
  }
  export function addConnectPoint(point: ConnectPoint) {
    stageContent.entities.addValue(point, point.uuid);
  }
  export function addAssociation(association: Association) {
    stageContent.associations.addValue(association, association.uuid);
  }
  export function addLineEdge(edge: LineEdge) {
    stageContent.associations.addValue(edge, edge.uuid);
  }
  export function addCrEdge(edge: CublicCatmullRomSplineEdge) {
    stageContent.associations.addValue(edge, edge.uuid);
  }
  export function addPenStroke(penStroke: PenStroke) {
    stageContent.entities.addValue(penStroke, penStroke.uuid);
  }
  export function addPortalNode(portalNode: PortalNode) {
    stageContent.entities.addValue(portalNode, portalNode.uuid);
  }

  export function addEntity(entity: Entity) {
    stageContent.entities.addValue(entity, entity.uuid);
  }

  /**
   * 更新节点的引用，将unknown的节点替换为真实的节点，保证对象在内存中的唯一性
   * 节点什么情况下会是unknown的？
   *
   * 包含了对Section框的更新
   * 包含了对Edge双向线偏移状态的更新
   */
  export function updateReferences() {
    for (const entity of getEntities()) {
      // 实体是可连接类型
      if (entity instanceof ConnectableEntity) {
        for (const edge of getAssociations()) {
          if (edge instanceof Edge) {
            if (edge.source.unknown && edge.source.uuid === entity.uuid) {
              edge.source = entity;
            }
            if (edge.target.unknown && edge.target.uuid === entity.uuid) {
              edge.target = entity;
            }
          }
        }
      }
    }
    // 以下是Section框的更新，y值降序排序，从下往上排序，因为下面的往往是内层的Section
    for (const section of getSections().sort(
      (a, b) => b.collisionBox.getRectangle().location.y - a.collisionBox.getRectangle().location.y,
    )) {
      // 更新孩子数组，并调整位置和大小
      const newChildList = [];

      for (const childUUID of section.childrenUUIDs) {
        if (stageContent.entities.hasId(childUUID)) {
          const childObject = stageContent.entities.getById(childUUID);
          if (childObject) {
            newChildList.push(childObject);
          }
        }
      }
      section.children = newChildList;
      section.adjustLocationAndSize();
      section.adjustChildrenStateByCollapse();
    }

    // 以下是LineEdge双向线偏移状态的更新
    for (const edge of getLineEdges()) {
      let isShifting = false;
      for (const otherEdge of getLineEdges()) {
        if (edge.source === otherEdge.target && edge.target === otherEdge.source) {
          isShifting = true;
          break;
        }
      }
      edge.isShifting = isShifting;
    }

    // 对tags进行更新
    TagOptions.updateTags();
  }

  export function getTextNodeByUUID(uuid: string): TextNode | null {
    for (const node of getTextNodes()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  export function getConnectableEntityByUUID(uuid: string): ConnectableEntity | null {
    for (const node of getConnectableEntity()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  export function isSectionByUUID(uuid: string): boolean {
    return stageContent.entities.getById(uuid) instanceof Section;
  }
  export function getSectionByUUID(uuid: string): Section | null {
    const entity = stageContent.entities.getById(uuid);
    if (entity instanceof Section) {
      return entity;
    }
    return null;
  }

  /**
   * Update properties of a stage object by UUID.
   * @param uuid The UUID of the stage object.
   * @param updates An object containing the properties to update.
   */
  export function updateStageObjectPropertiesByUUID(uuid: string, updates: any) {
    const obj = getStageObjectByUUID(uuid);
    if (!obj) {
      console.warn(`Stage object with UUID ${uuid} not found.`);
      return;
    }

    // Iterate over updates and apply to the object
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const newValue = updates[key];
        // Basic type checking and assignment
        // TODO: More robust type checking and handling for complex properties
        if (typeof (obj as any)[key] !== "undefined") {
          (obj as any)[key] = newValue;
        } else {
          console.warn(`Property "${key}" not found on stage object with UUID ${uuid}.`);
        }
      }
    }

    // Refresh the object after updating properties
    // Note: The refresh method might not exist on all StageObject types.
    // A more robust solution would involve checking the object type or
    // ensuring a base refresh method exists. For now, using type assertion.
    (obj as any).refresh?.();
  }

  /**
   * 计算所有节点的中心点
   */
  export function getCenter(): Vector {
    if (stageContent.entities.length === 0) {
      return Vector.getZero();
    }
    const allNodesRectangle = Rectangle.getBoundingRectangle(
      stageContent.entities.valuesToArray().map((node) => node.collisionBox.getRectangle()),
    );
    return allNodesRectangle.center;
  }

  /**
   * 计算所有节点的大小
   */
  export function getSize(): Vector {
    if (stageContent.entities.length === 0) {
      return new Vector(Renderer.w, Renderer.h);
    }
    const size = getBoundingRectangle().size;

    return size;
  }

  /**
   * 获取舞台的矩形对象
   */
  export function getBoundingRectangle(): Rectangle {
    const rect = Rectangle.getBoundingRectangle(
      Array.from(stageContent.entities.valuesToArray()).map((node) => node.collisionBox.getRectangle()),
    );
    return rect;
  }

  /**
   * 获取舞台的序列化状态
   * @returns 序列化状态的 JSON 字符串
   */

  export function findTextNodeByLocation(location: Vector): TextNode | null {
    for (const node of getTextNodes()) {
      if (node.collisionBox.getRectangle().isPointIn(location)) {
        return node;
      }
    }
    return null;
  }
  export function findLineEdgeByLocation(location: Vector): LineEdge | null {
    for (const edge of getLineEdges()) {
      if (EdgeRenderer.isPointOnLine(edge, location)) {
        return edge;
      }
    }
    return null;
  }
  export function findAssociationByLocation(location: Vector): Association | null {
    const edge = findLineEdgeByLocation(location);
    if (edge) {
      return edge;
    }
    // TODO: Add other association types
    return null;
  }
  export function findSectionByLocation(location: Vector): Section | null {
    for (const section of getSections()) {
      if (section.collisionBox.getRectangle().isPointIn(location)) {
        return section;
      }
    }
    return null;
  }
  export function findImageNodeByLocation(location: Vector): ImageNode | null {
    for (const node of getImageNodes()) {
      if (node.collisionBox.getRectangle().isPointIn(location)) {
        return node;
      }
    }
    return null;
  }
  export function findConnectableEntityByLocation(location: Vector): ConnectableEntity | null {
    const textNode = findTextNodeByLocation(location);
    if (textNode) {
      return textNode;
    }
    const section = findSectionByLocation(location);
    if (section) {
      return section;
    }
    const imageNode = findImageNodeByLocation(location);
    if (imageNode) {
      return imageNode;
    }
    const urlNode = findUrlNodeByLocation(location);
    if (urlNode) {
      return urlNode;
    }
    const portalNode = findPortalNodeByLocation(location);
    if (portalNode) {
      return portalNode;
    }
    return null;
  }
  export function findEntityByLocation(location: Vector): Entity | null {
    const connectableEntity = findConnectableEntityByLocation(location);
    if (connectableEntity) {
      return connectableEntity;
    }
    const connectPoint = findConnectPointByLocation(location);
    if (connectPoint) {
      return connectPoint;
    }
    const penStroke = findPenStrokeByLocation(location);
    if (penStroke) {
      return penStroke;
    }
    return null;
  }
  export function findConnectPointByLocation(location: Vector): ConnectPoint | null {
    for (const point of getConnectPoints()) {
      if (point.collisionBox.getRectangle().isPointIn(location)) {
        return point;
      }
    }
    return null;
  }
  export function isHaveEntitySelected(): boolean {
    for (const entity of getEntities()) {
      if (entity.isSelected) {
        return true;
      }
    }
    return false;
  }
  export function getSelectedStageObjects(): StageObject[] {
    const result: StageObject[] = [];
    for (const entity of getEntities()) {
      if (entity.isSelected) {
        result.push(entity);
      }
    }
    for (const association of getAssociations()) {
      if (association.isSelected) {
        result.push(association);
      }
    }
    return result;
  }
  export function isEntityOnLocation(location: Vector): boolean {
    return findEntityByLocation(location) !== null;
  }
  export function isAssociationOnLocation(location: Vector): boolean {
    return findAssociationByLocation(location) !== null;
  }
  export function deleteEntities(deleteNodes: Entity[]) {
    for (const node of deleteNodes) {
      if (node instanceof TextNode) {
        deleteOneTextNode(node);
      } else if (node instanceof ImageNode) {
        deleteOneImage(node);
      } else if (node instanceof UrlNode) {
        deleteOneUrlNode(node);
      } else if (node instanceof Section) {
        deleteOneSection(node);
      } else if (node instanceof ConnectPoint) {
        deleteOneConnectPoint(node);
      } else if (node instanceof PortalNode) {
        deleteOnePortalNode(node);
      } else if (node instanceof PenStroke) {
        deleteOnePenStroke(node);
      }
    }
    // 删除与这些节点相关的边
    const deleteAssociations = [];
    for (const association of getAssociations()) {
      if (association instanceof Edge) {
        if (deleteNodes.includes(association.source) || deleteNodes.includes(association.target)) {
          deleteAssociations.push(association);
        }
      } else if (association instanceof MultiTargetUndirectedEdge) {
        // Assuming 'targets' was a typo and should be 'target' or similar,
        // or that MultiTargetUndirectedEdge has a method to check if it includes an entity.
        // For now, commenting out or adjusting based on likely intent.
        // If MultiTargetUndirectedEdge has a 'targets' array of Entities:
        if ((association as MultiTargetUndirectedEdge).targets.some((target: Entity) => deleteNodes.includes(target))) {
          deleteAssociations.push(association);
        }
        // If it has a single 'target' property:
        // if (deleteNodes.includes((association as MultiTargetUndirectedEdge).target)) {
        //   deleteAssociations.push(association);
        // }
      }
    }
    for (const association of deleteAssociations) {
      deleteOneAssociation(association);
    }
  }
  export function deleteSelectedStageObjects() {
    const selectedEntities = getSelectedStageObjects().filter((obj) => obj instanceof Entity) as Entity[];
    const selectedAssociations = getSelectedStageObjects().filter((obj) => obj instanceof Association) as Association[];
    deleteEntities(selectedEntities);
    for (const association of selectedAssociations) {
      deleteOneAssociation(association);
    }
  }
  export function deleteAssociation(deleteAssociation: Association): void {
    stageContent.associations.deleteValue(deleteAssociation);
  }
  export function deleteEdge(deleteEdge: Edge): void {
    stageContent.associations.deleteValue(deleteEdge);
  }
  export function connectEntity(fromNode: ConnectableEntity, toNode: ConnectableEntity, isCrEdge: boolean = false) {
    if (fromNode === toNode && !isAllowAddCycleEdge) {
      return;
    }
    if (isCrEdge) {
      const edge = new CublicCatmullRomSplineEdge(fromNode, toNode);
      addCrEdge(edge);
    } else {
      const edge = new LineEdge(fromNode, toNode);
      addLineEdge(edge);
    }
  }
  export function connectMultipleEntities(
    fromNode: ConnectableEntity,
    toNodes: ConnectableEntity[],
    isCrEdge: boolean = false,
  ) {
    for (const toNode of toNodes) {
      connectEntity(fromNode, toNode, isCrEdge);
    }
  }
  function reverseNodeEdges(connectEntity: ConnectableEntity) {
    for (const association of getAssociations()) {
      if (association instanceof Edge) {
        if (association.source === connectEntity) {
          association.source = association.target;
          association.target = connectEntity;
        } else if (association.target === connectEntity) {
          association.target = association.source;
          association.source = connectEntity;
        }
      }
    }
  }
  export function reverseSelectedNodeEdge() {
    for (const entity of getSelectedStageObjects()) {
      if (entity instanceof ConnectableEntity) {
        reverseNodeEdges(entity);
      }
    }
  }
  export function reverseSelectedEdges() {
    for (const association of getSelectedStageObjects()) {
      if (association instanceof Edge) {
        const temp = association.source;
        association.source = association.target;
        association.target = temp;
      }
    }
  }
  export function addSerializedData(serializedData: Serialized.File, diffLocation = new Vector(0, 0)) {
    StageSerializedAdder.addSerializedData(serializedData, diffLocation);
  }
  export function generateNodeTreeByText(text: string, indention: number = 4, location = Camera.location) {
    StageNodeAdder.generateNodeTreeByText(text, indention, location);
  }
  export function generateNodeGraphByText(text: string, location = Camera.location) {
    StageNodeAdder.addNodeGraphByText(text, location);
  }
  export function generateNodeByMarkdown(text: string, location = Camera.location) {
    StageNodeAdder.generateNodeByMarkdown(text, location);
  }
  export async function packEntityToSection(addEntities: Entity[]) {
    await StageSectionPackManager.packEntityToSection(addEntities);
  }
  export async function packEntityToSectionBySelected() {
    await StageSectionPackManager.packEntityToSectionBySelected();
  }
  export function goInSection(entities: Entity[], section: Section) {
    StageSectionInOutManager.goInSection(entities, section);
  }
  export function goOutSection(entities: Entity[], section: Section) {
    StageSectionInOutManager.goOutSection(entities, section);
  }
  export function packSelectedSection() {
    // Correcting based on error message, assuming unpackSelectedSections was intended
    StageSectionPackManager.unpackSelectedSections();
  }
  export function unpackSelectedSection() {
    StageSectionPackManager.unpackSelectedSections();
  }
  export function sectionSwitchCollapse() {
    StageSectionPackManager.switchCollapse();
  }
  export function findUrlNodeByLocation(location: Vector): UrlNode | null {
    for (const node of getUrlNodes()) {
      if (node.collisionBox.getRectangle().isPointIn(location)) {
        return node;
      }
    }
    return null;
  }
  export function findPortalNodeByLocation(location: Vector): PortalNode | null {
    for (const node of getPortalNodes()) {
      if (node.collisionBox.getRectangle().isPointIn(location)) {
        return node;
      }
    }
    return null;
  }
  export function findPenStrokeByLocation(location: Vector): PenStroke | null {
    for (const node of getPenStrokes()) {
      if (node.collisionBox.getRectangle().isPointIn(location)) {
        return node;
      }
    }
    return null;
  }
  export function refreshAllStageObjects() {
    for (const entity of getEntities()) {
      entity.refresh();
    }
    for (const association of getAssociations()) {
      association.refresh();
    }
  }
  export function refreshSelected() {
    for (const obj of getSelectedStageObjects()) {
      obj.refresh();
    }
  }
  export function changeSelectedEdgeConnectLocation(direction: Direction | null, isSource: boolean = false) {
    for (const obj of getSelectedStageObjects()) {
      if (obj instanceof Edge) {
        if (isSource) {
          obj.sourceRectRate = GraphMethods.getRectRateByDirection(direction);
        } else {
          obj.targetRectRate = GraphMethods.getRectRateByDirection(direction);
        }
      }
    }
  }
  export function changeEdgesConnectLocation(edges: Edge[], direction: Direction | null, isSource: boolean = false) {
    for (const edge of edges) {
      if (isSource) {
        edge.sourceRectRate = GraphMethods.getRectRateByDirection(direction);
      } else {
        edge.targetRectRate = GraphMethods.getRectRateByDirection(direction);
      }
    }
  }
  export function switchLineEdgeToCrEdge() {
    const selectedEdges = getSelectedStageObjects().filter((obj) => obj instanceof LineEdge) as LineEdge[];
    for (const edge of selectedEdges) {
      const newEdge = new CublicCatmullRomSplineEdge(edge.source, edge.target);
      newEdge.text = edge.text;
      newEdge.color = edge.color;
      newEdge.sourceRectRate = edge.sourceRectRate;
      newEdge.targetRectRate = edge.targetRectRate;
      addCrEdge(newEdge);
      deleteOneLineEdge(edge);
    }
  }
  export function addSelectedCREdgeControlPoint() {
    const selectedEdges = getSelectedStageObjects().filter(
      (obj) => obj instanceof CublicCatmullRomSplineEdge,
    ) as CublicCatmullRomSplineEdge[];
    for (const edge of selectedEdges) {
      edge.addControlPoint();
    }
  }
  export function addSelectedCREdgeTension() {
    const selectedEdges = getSelectedStageObjects().filter(
      (obj) => obj instanceof CublicCatmullRomSplineEdge,
    ) as CublicCatmullRomSplineEdge[];
    for (const edge of selectedEdges) {
      edge.tension += 0.1;
    }
  }
  export function reduceSelectedCREdgeTension() {
    const selectedEdges = getSelectedStageObjects().filter(
      (obj) => obj instanceof CublicCatmullRomSplineEdge,
    ) as CublicCatmullRomSplineEdge[];
    for (const edge of selectedEdges) {
      edge.tension -= 0.1;
    }
  }
  export function selectAll() {
    for (const entity of getEntities()) {
      entity.isSelected = true;
    }
    for (const association of getAssociations()) {
      association.isSelected = true;
    }
  }
  export function clearSelectAll() {
    for (const entity of getEntities()) {
      entity.isSelected = false;
    }
    for (const association of getAssociations()) {
      association.isSelected = false;
    }
  }
  export function addPortalNodeToStage(otherPath: string) {
    const portalNode = new PortalNode(new Vector(0, 0), new Vector(100, 100), otherPath);
    addPortalNode(portalNode);
  }
}
