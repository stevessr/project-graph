import { v4 } from "uuid";
import { Direction } from "../../../types/directions";
import { Serialized } from "../../../types/node";
import { PathString } from "../../../utils/pathString";
import { Rectangle } from "../../dataStruct/shape/Rectangle";
import { StringDict } from "../../dataStruct/StringDict";
import { Vector } from "../../dataStruct/Vector";
import { EdgeRenderer } from "../../render/canvas2d/entityRenderer/edge/EdgeRenderer";
import { Renderer } from "../../render/canvas2d/renderer";
import { EntityShrinkEffect } from "../../service/feedbackService/effectEngine/concrete/EntityShrinkEffect";
import { PenStrokeDeletedEffect } from "../../service/feedbackService/effectEngine/concrete/PenStrokeDeletedEffect";
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
import { StageDeleteManager } from "./concreteMethods/StageDeleteManager";
import { StageNodeAdder } from "./concreteMethods/stageNodeAdder";
import { StageNodeConnector } from "./concreteMethods/StageNodeConnector";
import { StageObjectSelectCounter } from "./concreteMethods/StageObjectSelectCounter";
import { StageSectionInOutManager } from "./concreteMethods/StageSectionInOutManager";
import { StageSectionPackManager } from "./concreteMethods/StageSectionPackManager";
import { StageSerializedAdder } from "./concreteMethods/StageSerializedAdder";
import { StageTagManager } from "./concreteMethods/StageTagManager";
import { StageHistoryManager } from "./StageHistoryManager";
import { TextRiseEffect } from "../../service/feedbackService/effectEngine/concrete/TextRiseEffect";
import { MultiTargetUndirectedEdge } from "../stageObject/association/MutiTargetUndirectedEdge";

// littlefean:应该改成类，实例化的对象绑定到舞台上。这成单例模式了
// 开发过程中会造成多开
// zty012:这个是存储数据的，和舞台无关，应该单独抽离出来
// 并且会在舞台之外的地方操作，所以应该是namespace单例

// TODO: Refactor StageManager from a namespace singleton to a class instance bound to the Stage.
// This will improve modularity and address potential issues with multiple instances.

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
export class StageManager {
  private stageContent: stageContent;
  private childStageContent: Record<string, stageContent>;
  private childStageCameraData: Record<string, ChildCameraData>;

  public isEnableEntityCollision: boolean = false;
  public isAllowAddCycleEdge: boolean = false;

  constructor() {
    this.stageContent = {
      entities: StringDict.create(),
      associations: StringDict.create(),
      tags: [],
    };
    this.childStageContent = {};
    this.childStageCameraData = {};
    this.init(); // Call init in constructor
  }

  private init() {
    Settings.watch("isEnableEntityCollision", (value) => {
      this.isEnableEntityCollision = value;
    });
    Settings.watch("allowAddCycleEdge", (value) => {
      this.isAllowAddCycleEdge = value;
    });
  }

  public getStageContentDebug() {
    return this.stageContent.entities.length;
  }

  public getStageJsonByPlugin(): string {
    return JSON.stringify(this.stageContent);
  }

  public updateChildStageCameraData(path: string, data: ChildCameraData) {
    this.childStageCameraData[path] = data;
  }
  public getChildStageCameraData(path: string) {
    return this.childStageCameraData[path];
  }

  public storeMainStage() {
    this.childStageContent["main"] = {
      entities: this.stageContent.entities.clone(),
      associations: this.stageContent.associations.clone(),
      tags: [...this.stageContent.tags],
    };
  }
  public restoreMainStage() {
    this.stageContent.associations = this.childStageContent["main"].associations.clone();
    this.stageContent.entities = this.childStageContent["main"].entities.clone();
    this.stageContent.tags = [...this.childStageContent["main"].tags];
  }
  public storeMainStageToChildStage(path: string) {
    this.childStageContent[path] = {
      entities: this.stageContent.entities.clone(),
      associations: this.stageContent.associations.clone(),
      tags: [...this.stageContent.tags],
    };
  }
  public storeChildStageToMainStage(path: string) {
    this.stageContent.associations = this.childStageContent[path].associations.clone();
    this.stageContent.entities = this.childStageContent[path].entities.clone();
    this.stageContent.tags = [...this.childStageContent[path].tags];
  }
  public getAllChildStageKeys(): string[] {
    return Object.keys(this.childStageContent).filter((key) => key !== "main");
  }
  public clearAllChildStage() {
    for (const key of Object.keys(this.childStageContent)) {
      if (key !== "main") {
        this.childStageContent[key].entities.clear();
        this.childStageContent[key].associations.clear();
        this.childStageContent[key].tags = [];
      }
    }
  }
  // 使用这个方法时要提前保证当前主舞台槽上放的是主舞台
  public getAllChildStageKeysAndCamera(): { key: string; camera: ChildCameraData }[] {
    const result = [];
    for (const entity of this.getEntities().filter((entity) => entity instanceof PortalNode)) {
      const newKey = PathString.relativePathToAbsolutePath(
        PathString.dirPath(Stage.path.getFilePath()),
        (entity as PortalNode).portalFilePath, // Type assertion
      );
      const item = {
        key: newKey,
        camera: {
          location: (entity as PortalNode).location, // Type assertion
          zoom: (entity as PortalNode).cameraScale, // Type assertion
          size: (entity as PortalNode).size, // Type assertion
          targetLocation: (entity as PortalNode).targetLocation, // Type assertion
        },
      };
      result.push(item);
    }
    return result;
  }

  public isEmpty(): boolean {
    return this.stageContent.entities.length === 0;
  }
  public getTextNodes(): TextNode[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is TextNode => node instanceof TextNode);
  }
  public getConnectableEntity(): ConnectableEntity[] {
    return this.stageContent.entities
      .valuesToArray()
      .filter((node): node is ConnectableEntity => node instanceof ConnectableEntity);
  }
  public isEntityExists(uuid: string): boolean {
    return this.stageContent.entities.hasId(uuid);
  }
  public getSections(): Section[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is Section => node instanceof Section);
  }
  public getImageNodes(): ImageNode[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is ImageNode => node instanceof ImageNode);
  }
  public getConnectPoints(): ConnectPoint[] {
    return this.stageContent.entities
      .valuesToArray()
      .filter((node): node is ConnectPoint => node instanceof ConnectPoint);
  }
  public getUrlNodes(): UrlNode[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is UrlNode => node instanceof UrlNode);
  }
  public getPortalNodes(): PortalNode[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is PortalNode => node instanceof PortalNode);
  }
  public getPenStrokes(): PenStroke[] {
    return this.stageContent.entities.valuesToArray().filter((node): node is PenStroke => node instanceof PenStroke);
  }

  public getStageObject(): StageObject[] {
    const result: StageObject[] = [];
    result.push(...this.stageContent.entities.valuesToArray());
    result.push(...this.stageContent.associations.valuesToArray());
    return result;
  }

  /**
   * 获取场上所有的实体
   * @returns
   */
  public getEntities(): Entity[] {
    return this.stageContent.entities.valuesToArray();
  }
  public getStageObjectByUUID(uuid: string): StageObject | null {
    const entity = this.stageContent.entities.getById(uuid);
    if (entity) {
      return entity;
    }
    const association = this.stageContent.associations.getById(uuid);
    if (association) {
      return association;
    }
    return null;
  }
  public getEntitiesByUUIDs(uuids: string[]): Entity[] {
    const result: Entity[] = [];
    for (const uuid of uuids) {
      const entity = this.stageContent.entities.getById(uuid);
      if (entity) {
        result.push(entity);
      }
    }
    return result;
  }
  public isNoEntity(): boolean {
    return this.stageContent.entities.length === 0;
  }
  public deleteOneTextNode(node: TextNode) {
    this.stageContent.entities.deleteValue(node);
  }
  public deleteOneImage(node: ImageNode) {
    this.stageContent.entities.deleteValue(node);
  }
  public deleteOneUrlNode(node: UrlNode) {
    this.stageContent.entities.deleteValue(node);
  }
  public deleteOneSection(section: Section) {
    this.stageContent.entities.deleteValue(section);
  }
  public deleteOneConnectPoint(point: ConnectPoint) {
    this.stageContent.entities.deleteValue(point);
  }
  public deleteOnePortalNode(node: PortalNode) {
    this.stageContent.entities.deleteValue(node);
  }
  public deleteOnePenStroke(penStroke: PenStroke) {
    this.stageContent.entities.deleteValue(penStroke);
  }
  public deleteOneEntity(entity: Entity) {
    this.stageContent.entities.deleteValue(entity);
  }
  public deleteOneLineEdge(edge: LineEdge) {
    this.stageContent.associations.deleteValue(edge);
  }
  public deleteOneAssociation(association: Association) {
    this.stageContent.associations.deleteValue(association);
  }

  public getAssociations(): Association[] {
    return this.stageContent.associations.valuesToArray();
  }
  public getEdges(): Edge[] {
    return this.stageContent.associations.valuesToArray().filter((edge): edge is Edge => edge instanceof Edge);
  }
  public getLineEdges(): LineEdge[] {
    return this.stageContent.associations.valuesToArray().filter((edge): edge is LineEdge => edge instanceof LineEdge);
  }
  public getCrEdges(): CublicCatmullRomSplineEdge[] {
    return this.stageContent.associations
      .valuesToArray()
      .filter((edge): edge is CublicCatmullRomSplineEdge => edge instanceof CublicCatmullRomSplineEdge);
  }

  /**
   * 销毁函数
   * 以防开发过程中造成多开
   */
  public destroy() {
    this.stageContent.entities.clear();
    this.stageContent.associations.clear();
    this.stageContent.tags = [];
  }

  // TagOptions methods
  public resetTags(uuids: string[]) {
    this.stageContent.tags = [];
    for (const uuid of uuids) {
      this.stageContent.tags.push(uuid);
    }
  }
  public addTag(uuid: string) {
    this.stageContent.tags.push(uuid);
  }
  public removeTag(uuid: string) {
    const index = this.stageContent.tags.indexOf(uuid);
    if (index !== -1) {
      this.stageContent.tags.splice(index, 1);
    }
  }
  public hasTag(uuid: string): boolean {
    return this.stageContent.tags.includes(uuid);
  }
  public getTagUUIDs(): string[] {
    return this.stageContent.tags;
  }
  /**
   * 清理未引用的标签
   */
  public updateTags() {
    const uuids = this.stageContent.tags.slice();
    for (const uuid of uuids) {
      if (!this.stageContent.entities.hasId(uuid) && !this.stageContent.associations.hasId(uuid)) {
        this.stageContent.tags.splice(this.stageContent.tags.indexOf(uuid), 1);
      }
    }
  }

  public moveUpTag(uuid: string) {
    const index = this.stageContent.tags.indexOf(uuid);
    if (index !== -1 && index > 0) {
      const temp = this.stageContent.tags[index - 1];
      this.stageContent.tags[index - 1] = uuid;
      this.stageContent.tags[index] = temp;
      console.log("move up tag");
    }
  }
  public moveDownTag(uuid: string) {
    const index = this.stageContent.tags.indexOf(uuid);
    if (index !== -1 && index < this.stageContent.tags.length - 1) {
      const temp = this.stageContent.tags[index + 1];
      this.stageContent.tags[index + 1] = uuid;
      this.stageContent.tags[index] = temp;
      console.log("move down tag");
    }
  }

  // Comment out the old namespace for now

  public addTextNode(node: TextNode) {
    this.stageContent.entities.addValue(node, node.uuid);
  }
  public addUrlNode(node: UrlNode) {
    this.stageContent.entities.addValue(node, node.uuid);
  }
  public addImageNode(node: ImageNode) {
    this.stageContent.entities.addValue(node, node.uuid);
  }
  public addSection(section: Section) {
    this.stageContent.entities.addValue(section, section.uuid);
  }
  public addConnectPoint(point: ConnectPoint) {
    this.stageContent.entities.addValue(point, point.uuid);
  }
  public addAssociation(association: Association) {
    this.stageContent.associations.addValue(association, association.uuid);
  }
  public addLineEdge(edge: LineEdge) {
    this.stageContent.associations.addValue(edge, edge.uuid);
  }
  public addCrEdge(edge: CublicCatmullRomSplineEdge) {
    this.stageContent.associations.addValue(edge, edge.uuid);
  }
  public addPenStroke(penStroke: PenStroke) {
    this.stageContent.entities.addValue(penStroke, penStroke.uuid);
  }
  public addPortalNode(portalNode: PortalNode) {
    this.stageContent.entities.addValue(portalNode, portalNode.uuid);
  }

  public addEntity(entity: Entity) {
    this.stageContent.entities.addValue(entity, entity.uuid);
  }

  /**
   * 更新节点的引用，将unknown的节点替换为真实的节点，保证对象在内存中的唯一性
   * 节点什么情况下会是unknown的？
   *
   * 包含了对Section框的更新
   * 包含了对Edge双向线偏移状态的更新
   */
  public updateReferences() {
    for (const entity of this.getEntities()) {
      // 实体是可连接类型
      if (entity instanceof ConnectableEntity) {
        for (const edge of this.getAssociations()) {
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
    for (const section of this.getSections().sort(
      (a: Section, b: Section) => b.collisionBox.getRectangle().location.y - a.collisionBox.getRectangle().location.y,
    )) {
      // 更新孩子数组，并调整位置和大小
      const newChildList: Entity[] = [];

      for (const childUUID of section.childrenUUIDs) {
        if (this.stageContent.entities.hasId(childUUID)) {
          const childObject = this.stageContent.entities.getById(childUUID);
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
    for (const edge of this.getLineEdges()) {
      let isShifting = false;
      for (const otherEdge of this.getLineEdges()) {
        if (edge.source === otherEdge.target && edge.target === otherEdge.source) {
          isShifting = true;
          break;
        }
      }
      edge.isShifting = isShifting;
    }

    // 对tags进行更新
    this.updateTags();
  }

  public getTextNodeByUUID(uuid: string): TextNode | null {
    for (const node of this.getTextNodes()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  public getConnectableEntityByUUID(uuid: string): ConnectableEntity | null {
    for (const node of this.getConnectableEntity()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  public isSectionByUUID(uuid: string): boolean {
    const entity = this.stageContent.entities.getById(uuid);
    return entity instanceof Section;
  }
  public getSectionByUUID(uuid: string): Section | null {
    const entity = this.stageContent.entities.getById(uuid);
    if (entity instanceof Section) {
      return entity;
    }
    return null;
  }

  /**
   * 计算所有节点的中心点
   */
  public getCenter(): Vector {
    if (this.stageContent.entities.length === 0) {
      return Vector.getZero();
    }
    const allNodesRectangle = Rectangle.getBoundingRectangle(
      this.stageContent.entities.valuesToArray().map((node) => node.collisionBox.getRectangle()),
    );
    return allNodesRectangle.center;
  }

  /**
   * 计算所有节点的大小
   */
  public getSize(): Vector {
    if (this.stageContent.entities.length === 0) {
      return new Vector(Renderer.w, Renderer.h);
    }
    const size = this.getBoundingRectangle().size;

    return size;
  }

  /**
   * 获取舞台的矩形对象
   */
  public getBoundingRectangle(): Rectangle {
    const rect = Rectangle.getBoundingRectangle(
      Array.from(this.stageContent.entities.valuesToArray()).map((node) => node.collisionBox.getRectangle()),
    );

    return rect;
  }

  /**
   * 根据位置查找节点，常用于点击事件
   * @param location
   * @returns
   */
  public findTextNodeByLocation(location: Vector): TextNode | null {
    for (const node of this.getTextNodes()) {
      if (node.collisionBox.isContainsPoint(location)) {
        return node;
      }
    }
    return null;
  }

  /**
   * 用于鼠标悬停时查找边
   * @param location
   * @returns
   */
  public findLineEdgeByLocation(location: Vector): LineEdge | null {
    for (const edge of this.getLineEdges()) {
      if (edge.collisionBox.isContainsPoint(location)) {
        return edge;
      }
    }
    return null;
  }

  public findAssociationByLocation(location: Vector): Association | null {
    for (const association of this.getAssociations()) {
      if (association.collisionBox.isContainsPoint(location)) {
        return association;
      }
    }
    return null;
  }

  public findSectionByLocation(location: Vector): Section | null {
    for (const section of this.getSections()) {
      if (section.collisionBox.isContainsPoint(location)) {
        return section;
      }
    }
    return null;
  }

  public findImageNodeByLocation(location: Vector): ImageNode | null {
    for (const node of this.getImageNodes()) {
      if (node.collisionBox.isContainsPoint(location)) {
        return node;
      }
    }
    return null;
  }

  public findConnectableEntityByLocation(location: Vector): ConnectableEntity | null {
    for (const entity of this.getConnectableEntity()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return entity;
      }
    }
    return null;
  }

  /**
   * 优先级：
   * 涂鸦 > 其他
   * @param location
   * @returns
   */
  public findEntityByLocation(location: Vector): Entity | null {
    for (const penStroke of this.getPenStrokes()) {
      if (penStroke.isHiddenBySectionCollapse) continue;
      if (penStroke.collisionBox.isContainsPoint(location)) {
        return penStroke;
      }
    }
    for (const entity of this.getEntities()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return entity;
      }
    }
    return null;
  }

  public findConnectPointByLocation(location: Vector): ConnectPoint | null {
    for (const point of this.getConnectPoints()) {
      if (point.isHiddenBySectionCollapse) {
        continue;
      }
      if (point.collisionBox.isContainsPoint(location)) {
        return point;
      }
    }
    return null;
  }
  public isHaveEntitySelected(): boolean {
    for (const entity of this.getEntities()) {
      if (entity.isSelected) {
        return true;
      }
    }
    return false;
  }

  /**
   * O(n)
   * @returns
   */
  public getSelectedEntities(): Entity[] {
    return this.stageContent.entities.valuesToArray().filter((entity) => entity.isSelected);
  }
  public getSelectedAssociations(): Association[] {
    return this.stageContent.associations.valuesToArray().filter((association) => association.isSelected);
  }
  public getSelectedStageObjects(): StageObject[] {
    const result: StageObject[] = [];
    result.push(...this.getSelectedEntities());
    result.push(...this.getSelectedAssociations());
    return result;
  }

  /**
   * 判断某一点是否有实体存在（排除实体的被Section折叠）
   * @param location
   * @returns
   */
  public isEntityOnLocation(location: Vector): boolean {
    for (const entity of this.getEntities()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return true;
      }
    }
    return false;
  }
  public isAssociationOnLocation(location: Vector): boolean {
    for (const association of this.getAssociations()) {
      if (association instanceof Edge) {
        if (association.target.isHiddenBySectionCollapse && association.source.isHiddenBySectionCollapse) {
          continue;
        }
      }
      if (association.collisionBox.isContainsPoint(location)) {
        return true;
      }
    }
    return false;
  }

  // region 以下为舞台操作相关的函数
  // 建议不同的功能分类到具体的文件中，然后最后集中到这里调用，使得下面的显示简短一些
  // 每个操作函数尾部都要加一个记录历史的操作

  public deleteEntities(deleteNodes: Entity[]) {
    StageDeleteManager.deleteEntities(deleteNodes);
    StageHistoryManager.recordStep();
    // 更新选中节点计数
    StageObjectSelectCounter.update();
  }

  /**
   * 外部的交互层的delete键可以直接调用这个函数
   */
  public deleteSelectedStageObjects() {
    const selectedEntities = this.getEntities().filter((node) => node.isSelected);
    for (const entity of selectedEntities) {
      if (entity instanceof PenStroke) {
        Stage.effectMachine.addEffect(PenStrokeDeletedEffect.fromPenStroke(entity));
      } else {
        Stage.effectMachine.addEffect(EntityShrinkEffect.fromEntity(entity));
      }
    }
    this.deleteEntities(selectedEntities);

    for (const edge of this.getEdges()) {
      if (edge.isSelected) {
        this.deleteEdge(edge);
        Stage.effectMachine.addEffects(EdgeRenderer.getCuttingEffects(edge));
      }
    }
  }
  public deleteAssociation(deleteAssociation: Association): boolean {
    if (deleteAssociation instanceof Edge) {
      return this.deleteEdge(deleteAssociation);
    } else if (deleteAssociation instanceof MultiTargetUndirectedEdge) {
      const res = StageDeleteManager.deleteMultiTargetUndirectedEdge(deleteAssociation);
      StageHistoryManager.recordStep();
      // 更新选中边计数
      StageObjectSelectCounter.update();
      return res;
    }
    Stage.effectMachine.addEffect(TextRiseEffect.default("无法删除未知类型的关系"));
    return false;
  }

  public deleteEdge(deleteEdge: Edge): boolean {
    const res = StageDeleteManager.deleteEdge(deleteEdge);
    StageHistoryManager.recordStep();
    // 更新选中边计数
    StageObjectSelectCounter.update();
    return res;
  }

  public connectEntity(fromNode: ConnectableEntity, toNode: ConnectableEntity, isCrEdge: boolean = false) {
    if (fromNode === toNode && !this.isAllowAddCycleEdge) {
      return false;
    }
    if (isCrEdge) {
      StageNodeConnector.addCrEdge(fromNode, toNode);
    } else {
      StageNodeConnector.connectConnectableEntity(fromNode, toNode);
    }

    StageHistoryManager.recordStep();
    return GraphMethods.isConnected(fromNode, toNode);
  }

  /**
   * 多重连接，只记录一次历史
   * @param fromNodes
   * @param toNode
   * @param isCrEdge
   * @returns
   */
  public connectMultipleEntities(
    fromNodes: ConnectableEntity[],
    toNode: ConnectableEntity,
    isCrEdge: boolean = false,
    sourceRectRate?: [number, number],
    targetRectRate?: [number, number],
  ) {
    if (fromNodes.length === 0) {
      return false;
    }
    for (const fromNode of fromNodes) {
      if (fromNode === toNode && !this.isAllowAddCycleEdge) {
        continue;
      }
      if (isCrEdge) {
        StageNodeConnector.addCrEdge(fromNode, toNode);
      } else {
        StageNodeConnector.connectConnectableEntity(fromNode, toNode, "", targetRectRate, sourceRectRate);
      }
    }
    StageHistoryManager.recordStep();
    return true;
  }

  /**
   * 反转一个节点与他相连的所有连线方向
   * @param connectEntity
   */
  private reverseNodeEdges(connectEntity: ConnectableEntity) {
    const prepareReverseEdges: LineEdge[] = [];
    for (const edge of this.getLineEdges()) {
      if (edge.target === connectEntity || edge.source === connectEntity) {
        prepareReverseEdges.push(edge);
      }
    }
    StageNodeConnector.reverseEdges(prepareReverseEdges);
  }

  /**
   * 反转所有选中的节点的每个节点的连线
   */
  public reverseSelectedNodeEdge() {
    const entities = this.getSelectedEntities().filter(
      (entity): entity is ConnectableEntity => entity instanceof ConnectableEntity,
    );
    for (const entity of entities) {
      this.reverseNodeEdges(entity);
    }
  }

  public reverseSelectedEdges() {
    const selectedEdges = this.getLineEdges().filter((edge) => edge.isSelected);
    if (selectedEdges.length === 0) {
      return;
    }
    StageNodeConnector.reverseEdges(selectedEdges);
  }

  public addSerializedData(serializedData: Serialized.File, diffLocation = new Vector(0, 0)) {
    StageSerializedAdder.addSerializedData(serializedData, diffLocation);
    StageHistoryManager.recordStep();
  }

  public generateNodeTreeByText(text: string, indention: number = 4, location = Camera.location) {
    StageNodeAdder.addNodeTreeByText(text, indention, location);
    StageHistoryManager.recordStep();
  }

  public generateNodeGraphByText(text: string, location = Camera.location) {
    StageNodeAdder.addNodeGraphByText(text, location);
    StageHistoryManager.recordStep();
  }

  public generateNodeByMarkdown(text: string, location = Camera.location) {
    StageNodeAdder.addNodeByMarkdown(text, location);
    StageHistoryManager.recordStep();
  }

  /** 将多个实体打包成一个section，并添加到舞台中 */
  public async packEntityToSection(addEntities: Entity[]) {
    await StageSectionPackManager.packEntityToSection(addEntities);
    StageHistoryManager.recordStep();
  }

  /** 将选中的实体打包成一个section，并添加到舞台中 */
  public async packEntityToSectionBySelected() {
    const selectedNodes = this.getSelectedEntities();
    if (selectedNodes.length === 0) {
      return;
    }
    this.packEntityToSection(selectedNodes);
  }

  public goInSection(entities: Entity[], section: Section) {
    StageSectionInOutManager.goInSection(entities, section);
    StageHistoryManager.recordStep();
  }

  public goOutSection(entities: Entity[], section: Section) {
    StageSectionInOutManager.goOutSection(entities, section);
    StageHistoryManager.recordStep();
  }
  /** 将所有选中的Section折叠起来 */
  public packSelectedSection() {
    StageSectionPackManager.packSection();
    StageHistoryManager.recordStep();
  }

  /** 将所有选中的Section展开 */
  public unpackSelectedSection() {
    StageSectionPackManager.unpackSection();
    StageHistoryManager.recordStep();
  }

  /**
   * 切换选中的Section的折叠状态
   */
  public sectionSwitchCollapse() {
    StageSectionPackManager.switchCollapse();
    StageHistoryManager.recordStep();
  }

  public addTagBySelected() {
    StageTagManager.changeTagBySelected();
  }

  public refreshTags() {
    return StageTagManager.refreshTagNamesUI();
  }

  public moveCameraToTag(tag: string) {
    StageTagManager.moveCameraToTag(tag);
  }
  public connectEntityByCrEdge(fromNode: ConnectableEntity, toNode: ConnectableEntity) {
    return StageNodeConnector.addCrEdge(fromNode, toNode);
  }

  /**
   * 刷新所有舞台内容
   */
  public refreshAllStageObjects() {
    const entities = this.getEntities();
    for (const entity of entities) {
      if (entity instanceof TextNode) {
        if (entity.sizeAdjust === "auto") {
          entity.forceAdjustSizeByText();
        }
      } else if (entity instanceof ImageNode) {
        entity.refresh();
      } else if (entity instanceof Section) {
        entity.adjustLocationAndSize();
      }
    }
  }

  /**
   * 刷新选中内容
   */
  public refreshSelected() {
    const entities = this.getSelectedEntities();
    for (const entity of entities) {
      if (entity instanceof ImageNode) {
        entity.refresh();
      }
    }
  }

  /**
   * 改变连线的目标接头点位置
   * @param direction
   */
  public changeSelectedEdgeConnectLocation(direction: Direction | null, isSource: boolean = false) {
    const edges = this.getSelectedAssociations().filter((edge): edge is Edge => edge instanceof Edge);
    this.changeEdgesConnectLocation(edges, direction, isSource);
  }

  /**
   * 更改多个连线的目标接头点位置
   * @param edges
   * @param direction
   * @param isSource
   */
  public changeEdgesConnectLocation(edges: Edge[], direction: Direction | null, isSource: boolean = false) {
    const newLocationRate = new Vector(0.5, 0.5);
    if (direction === Direction.Left) {
      newLocationRate.x = 0.01;
    } else if (direction === Direction.Right) {
      newLocationRate.x = 0.99;
    } else if (direction === Direction.Up) {
      newLocationRate.y = 0.01;
    } else if (direction === Direction.Down) {
      newLocationRate.y = 0.99;
    }

    for (const edge of edges) {
      if (isSource) {
        edge.setSourceRectangleRate(newLocationRate);
      } else {
        edge.setTargetRectangleRate(newLocationRate);
      }
    }
  }

  public switchLineEdgeToCrEdge() {
    const prepareDeleteLineEdge: LineEdge[] = [];
    for (const edge of this.getLineEdges()) {
      if (edge instanceof LineEdge && edge.isSelected) {
        // 删除这个连线，并准备创建cr曲线
        prepareDeleteLineEdge.push(edge);
      }
    }
    for (const lineEdge of prepareDeleteLineEdge) {
      this.deleteEdge(lineEdge);
      this.connectEntityByCrEdge(lineEdge.source, lineEdge.target);
    }
  }

  /**
   * 有向边转无向边
   */
  public switchEdgeToUndirectedEdge() {
    const prepareDeleteLineEdge: LineEdge[] = [];
    for (const edge of this.getLineEdges()) {
      if (edge instanceof LineEdge && edge.isSelected) {
        // 删除这个连线，并准备创建
        prepareDeleteLineEdge.push(edge);
      }
    }
    for (const edge of prepareDeleteLineEdge) {
      if (edge.target === edge.source) {
        continue;
      }
      this.deleteEdge(edge);
      const undirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity([edge.target, edge.source]);
      undirectedEdge.text = edge.text;
      undirectedEdge.color = edge.color.clone();
      undirectedEdge.arrow = "outer";
      // undirectedEdge.isSelected = true;
      this.addAssociation(undirectedEdge);
    }
    StageObjectSelectCounter.update();
  }
  /**
   * 无向边转有向边
   */
  public switchUndirectedEdgeToEdge() {
    const prepareDeleteUndirectedEdge: MultiTargetUndirectedEdge[] = [];
    for (const edge of this.getAssociations()) {
      if (edge instanceof MultiTargetUndirectedEdge && edge.isSelected) {
        // 删除这个连线，并准备创建
        prepareDeleteUndirectedEdge.push(edge);
      }
    }
    for (const edge of prepareDeleteUndirectedEdge) {
      if (edge.targetUUIDs.length !== 2) {
        continue;
      }

      const entities = this.getEntitiesByUUIDs(edge.targetUUIDs);
      if (entities.length === 2) {
        const [fromNode, toNode] = entities;
        if (fromNode && toNode && fromNode instanceof ConnectableEntity && toNode instanceof ConnectableEntity) {
          const lineEdge = LineEdge.fromTwoEntity(fromNode, toNode);
          lineEdge.text = edge.text;
          lineEdge.color = edge.color.clone();
          this.deleteAssociation(edge);
          this.addLineEdge(lineEdge);
          this.updateReferences();
        }
      }
    }
  }

  public addSelectedCREdgeControlPoint() {
    const selectedCREdge = this.getSelectedAssociations().filter(
      (edge): edge is CublicCatmullRomSplineEdge => edge instanceof CublicCatmullRomSplineEdge,
    );
    for (const edge of selectedCREdge) {
      edge.addControlPoint();
    }
  }

  public addSelectedCREdgeTension() {
    const selectedCREdge = this.getSelectedAssociations().filter(
      (edge): edge is CublicCatmullRomSplineEdge => edge instanceof CublicCatmullRomSplineEdge,
    );
    for (const edge of selectedCREdge) {
      edge.tension += 0.25;
      edge.tension = Math.min(1, edge.tension);
    }
  }

  public reduceSelectedCREdgeTension() {
    const selectedCREdge = this.getSelectedAssociations().filter(
      (edge): edge is CublicCatmullRomSplineEdge => edge instanceof CublicCatmullRomSplineEdge,
    );
    for (const edge of selectedCREdge) {
      edge.tension -= 0.25;
      edge.tension = Math.max(0, edge.tension);
    }
  }

  /**
   * ctrl + A 全选
   */
  public selectAll() {
    const allEntity = this.stageContent.entities.valuesToArray();
    for (const entity of allEntity) {
      entity.isSelected = true;
    }
    const associations = this.stageContent.associations.valuesToArray();
    Stage.effectMachine.addEffect(TextRiseEffect.default(`${allEntity.length}个实体，${associations.length}个关系`));
  }
  public clearSelectAll() {
    for (const entity of this.stageContent.entities.valuesToArray()) {
      entity.isSelected = false;
    }
    for (const edge of this.stageContent.associations.valuesToArray()) {
      edge.isSelected = false;
    }
  }

  public addPortalNodeToStage(otherPath: string) {
    const uuid = v4();
    const relativePath = PathString.getRelativePath(Stage.path.getFilePath(), otherPath);
    if (relativePath === "") {
      return false;
    }
    this.stageContent.entities.addValue(
      new PortalNode({
        uuid: uuid,
        title: PathString.dirPath(otherPath),
        portalFilePath: relativePath,
        location: [Camera.location.x, Camera.location.y],
        size: [500, 500],
        cameraScale: 1,
      }),
      uuid,
    );
    StageHistoryManager.recordStep();
    return true;
  }
}
