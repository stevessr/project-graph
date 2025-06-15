import { Stage } from "../../../stage/Stage";
import { StageManager } from "../../../stage/stageManager/StageManager";
import { TextNode } from "../../../stage/stageObject/entity/TextNode";
//import { Section } from "../../../stage/stageObject/entity/Section";
//import { LineEdge } from "../../../stage/stageObject/association/LineEdge";
import { RectangleLittleNoteEffect } from "../../feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { TextRaiseEffectLocated } from "../../feedbackService/effectEngine/concrete/TextRaiseEffectLocated";
import { AutoComputeUtils } from "./AutoComputeUtils";
import { MathFunctions } from "./functions/mathLogic";
import { CompareFunctions } from "./functions/compareLogic";
import { StringFunctions } from "./functions/stringLogic";
import { ProgramFunctions } from "./functions/programLogic";
import { NodeLogic } from "./functions/nodeLogic";
import { LogicNodeNameEnum, LogicNodeSimpleOperatorEnum } from "./logicNodeNameEnum";

type MathFunctionType = (args: number[]) => number[];
type StringFunctionType = (args: string[]) => string[];
type OtherFunctionType = (fatherNodes: any[], childNodes: any[]) => string[];
type StringFunctionMap = Record<string, StringFunctionType>;
type OtherFunctionMap = Record<string, OtherFunctionType>;

/**
 * 将 MathFunctionType 转换为 StringFunctionType
 */
function funcTypeTrans(mF: MathFunctionType): StringFunctionType {
  return (args: string[]): string[] => {
    const numbers = args.map((arg) => AutoComputeUtils.stringToNumber(arg));
    const result = mF(numbers);
    return result.map((num) => String(num));
  };
}

/**
 * 简单符号与函数的映射
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MapOperationNameFunction: StringFunctionMap = {
  [LogicNodeSimpleOperatorEnum.ADD]: funcTypeTrans(MathFunctions.add),
  [LogicNodeSimpleOperatorEnum.SUBTRACT]: funcTypeTrans(MathFunctions.subtract),
  [LogicNodeSimpleOperatorEnum.MULTIPLY]: funcTypeTrans(MathFunctions.multiply),
  [LogicNodeSimpleOperatorEnum.DIVIDE]: funcTypeTrans(MathFunctions.divide),
  [LogicNodeSimpleOperatorEnum.MODULO]: funcTypeTrans(MathFunctions.modulo),
  [LogicNodeSimpleOperatorEnum.POWER]: funcTypeTrans(MathFunctions.power),
  [LogicNodeSimpleOperatorEnum.LT]: funcTypeTrans(CompareFunctions.lessThan),
  [LogicNodeSimpleOperatorEnum.GT]: funcTypeTrans(CompareFunctions.greaterThan),
  [LogicNodeSimpleOperatorEnum.LTE]: funcTypeTrans(CompareFunctions.isIncreasing),
  [LogicNodeSimpleOperatorEnum.GTE]: funcTypeTrans(CompareFunctions.isDecreasing),
  [LogicNodeSimpleOperatorEnum.EQ]: funcTypeTrans(CompareFunctions.isSame),
  [LogicNodeSimpleOperatorEnum.NEQ]: funcTypeTrans(CompareFunctions.isDistinct),
  [LogicNodeSimpleOperatorEnum.AND]: funcTypeTrans(MathFunctions.and),
  [LogicNodeSimpleOperatorEnum.OR]: funcTypeTrans(MathFunctions.or),
  [LogicNodeSimpleOperatorEnum.NOT]: funcTypeTrans(MathFunctions.not),
  [LogicNodeSimpleOperatorEnum.XOR]: funcTypeTrans(MathFunctions.xor),
};

/**
 * 双井号格式的名字与函数的映射
 */
const MapNameFunction: StringFunctionMap = {
  [LogicNodeNameEnum.ABS]: funcTypeTrans(MathFunctions.abs),
  [LogicNodeNameEnum.FLOOR]: funcTypeTrans(MathFunctions.floor),
  [LogicNodeNameEnum.CEIL]: funcTypeTrans(MathFunctions.ceil),
  [LogicNodeNameEnum.ROUND]: funcTypeTrans(MathFunctions.round),
  [LogicNodeNameEnum.SQRT]: funcTypeTrans(MathFunctions.sqrt),
  [LogicNodeNameEnum.ADD]: funcTypeTrans(MathFunctions.add),
  [LogicNodeNameEnum.SUBTRACT]: funcTypeTrans(MathFunctions.subtract),
  [LogicNodeNameEnum.MULTIPLY]: funcTypeTrans(MathFunctions.multiply),
  [LogicNodeNameEnum.DIVIDE]: funcTypeTrans(MathFunctions.divide),
  [LogicNodeNameEnum.MODULO]: funcTypeTrans(MathFunctions.modulo),
  [LogicNodeNameEnum.MAX]: funcTypeTrans(MathFunctions.max),
  [LogicNodeNameEnum.MIN]: funcTypeTrans(MathFunctions.min),
  [LogicNodeNameEnum.POWER]: funcTypeTrans(MathFunctions.power),
  [LogicNodeNameEnum.LOG]: funcTypeTrans(MathFunctions.log),
  [LogicNodeNameEnum.SIN]: funcTypeTrans(MathFunctions.sin),
  [LogicNodeNameEnum.COS]: funcTypeTrans(MathFunctions.cos),
  [LogicNodeNameEnum.TAN]: funcTypeTrans(MathFunctions.tan),
  [LogicNodeNameEnum.ASIN]: funcTypeTrans(MathFunctions.asin),
  [LogicNodeNameEnum.ACOS]: funcTypeTrans(MathFunctions.acos),
  [LogicNodeNameEnum.ATAN]: funcTypeTrans(MathFunctions.atan),
  [LogicNodeNameEnum.EXP]: funcTypeTrans(MathFunctions.exp),
  [LogicNodeNameEnum.LN]: funcTypeTrans(MathFunctions.ln),
  [LogicNodeNameEnum.LT]: funcTypeTrans(CompareFunctions.lessThan),
  [LogicNodeNameEnum.GT]: funcTypeTrans(CompareFunctions.greaterThan),
  [LogicNodeNameEnum.LTE]: funcTypeTrans(CompareFunctions.isIncreasing),
  [LogicNodeNameEnum.GTE]: funcTypeTrans(CompareFunctions.isDecreasing),
  [LogicNodeNameEnum.EQ]: funcTypeTrans(CompareFunctions.isSame),
  [LogicNodeNameEnum.NEQ]: funcTypeTrans(CompareFunctions.isDistinct),
  [LogicNodeNameEnum.COUNT]: funcTypeTrans(MathFunctions.count),
  [LogicNodeNameEnum.AVE]: funcTypeTrans(MathFunctions.average),
  [LogicNodeNameEnum.MEDIAN]: funcTypeTrans(MathFunctions.median),
  [LogicNodeNameEnum.MODE]: funcTypeTrans(MathFunctions.mode),
  [LogicNodeNameEnum.VARIANCE]: funcTypeTrans(MathFunctions.variance),
  [LogicNodeNameEnum.STANDARD_DEVIATION]: funcTypeTrans(MathFunctions.standardDeviation),
  [LogicNodeNameEnum.RANDOM]: funcTypeTrans(MathFunctions.random),
  [LogicNodeNameEnum.RANDOM_INT]: funcTypeTrans(MathFunctions.randomInt),
  [LogicNodeNameEnum.RANDOM_FLOAT]: funcTypeTrans(MathFunctions.randomFloat),
  [LogicNodeNameEnum.RANDOM_POISSON]: funcTypeTrans(MathFunctions.randomPoisson),
  [LogicNodeNameEnum.AND]: funcTypeTrans(MathFunctions.and),
  [LogicNodeNameEnum.OR]: funcTypeTrans(MathFunctions.or),
  [LogicNodeNameEnum.NOT]: funcTypeTrans(MathFunctions.not),
  [LogicNodeNameEnum.XOR]: funcTypeTrans(MathFunctions.xor),
  [LogicNodeNameEnum.UPPER]: StringFunctions.upper,
  [LogicNodeNameEnum.LOWER]: StringFunctions.lower,
  [LogicNodeNameEnum.LEN]: StringFunctions.len,
  [LogicNodeNameEnum.COPY]: StringFunctions.copy,
  [LogicNodeNameEnum.SPLIT]: StringFunctions.split,
  [LogicNodeNameEnum.REPLACE]: StringFunctions.replace,
  [LogicNodeNameEnum.CONNECT]: StringFunctions.connect,
  [LogicNodeNameEnum.CHECK_REGEX_MATCH]: StringFunctions.checkRegexMatch,
  [LogicNodeNameEnum.SET_VAR]: ProgramFunctions.setVar,
  [LogicNodeNameEnum.GET_VAR]: ProgramFunctions.getVar,
};

/**
 * 其他特殊功能的函数
 */
const MapOtherFunction: OtherFunctionMap = {
  [LogicNodeNameEnum.RGB]: NodeLogic.setColorByRGB,
  [LogicNodeNameEnum.RGBA]: NodeLogic.setColorByRGBA,
  [LogicNodeNameEnum.GET_LOCATION]: NodeLogic.getLocation,
  [LogicNodeNameEnum.SET_LOCATION]: NodeLogic.setLocation,
  [LogicNodeNameEnum.SET_LOCATION_BY_UUID]: NodeLogic.setLocationByUUID,
  [LogicNodeNameEnum.GET_LOCATION_BY_UUID]: NodeLogic.getLocationByUUID,
  [LogicNodeNameEnum.GET_SIZE]: NodeLogic.getSize,
  [LogicNodeNameEnum.GET_MOUSE_LOCATION]: NodeLogic.getMouseLocation,
  [LogicNodeNameEnum.GET_MOUSE_WORLD_LOCATION]: NodeLogic.getMouseWorldLocation,
  [LogicNodeNameEnum.GET_CAMERA_LOCATION]: NodeLogic.getCameraLocation,
  [LogicNodeNameEnum.SET_CAMERA_LOCATION]: NodeLogic.setCameraLocation,
  [LogicNodeNameEnum.GET_CAMERA_SCALE]: NodeLogic.getCameraScale,
  [LogicNodeNameEnum.SET_CAMERA_SCALE]: NodeLogic.setCameraScale,
  [LogicNodeNameEnum.IS_COLLISION]: NodeLogic.isCollision,
  [LogicNodeNameEnum.GET_TIME]: NodeLogic.getTime,
  [LogicNodeNameEnum.GET_DATE_TIME]: NodeLogic.getDateTime,
  [LogicNodeNameEnum.ADD_DATE_TIME]: NodeLogic.addDateTime,
  [LogicNodeNameEnum.PLAY_SOUND]: NodeLogic.playSound,
  [LogicNodeNameEnum.FPS]: NodeLogic.getFps,
  [LogicNodeNameEnum.GET_NODE_RGBA]: NodeLogic.getNodeRGBA,
  [LogicNodeNameEnum.GET_NODE_UUID]: NodeLogic.getNodeUUID,
  [LogicNodeNameEnum.COLLECT_NODE_DETAILS_BY_RGBA]: NodeLogic.collectNodeDetailsByRGBA,
  [LogicNodeNameEnum.COLLECT_NODE_NAME_BY_RGBA]: NodeLogic.collectNodeNameByRGBA,
  [LogicNodeNameEnum.CREATE_TEXT_NODE_ON_LOCATION]: NodeLogic.createTextNodeOnLocation,
  [LogicNodeNameEnum.IS_HAVE_ENTITY_ON_LOCATION]: NodeLogic.isHaveEntityOnLocation,
  [LogicNodeNameEnum.REPLACE_GLOBAL_CONTENT]: NodeLogic.replaceGlobalContent,
  [LogicNodeNameEnum.SEARCH_CONTENT]: NodeLogic.searchContent,
  [LogicNodeNameEnum.DELETE_PEN_STROKE_BY_COLOR]: NodeLogic.deletePenStrokeByColor,
  [LogicNodeNameEnum.DELAY_COPY]: NodeLogic.delayCopy,
  [LogicNodeNameEnum.CHAT_CONTENT]: NodeLogic.chatContent,
  [LogicNodeNameEnum.CHAT_SYSTEM_CONTENT]: NodeLogic.chatSystemContent,
};

/**
 * 手动执行引擎
 * 用于手动执行选中的逻辑节点
 */
export namespace ManualExecutionEngine {
  /**
   * 检查节点是否是逻辑节点
   */
  export function isTextNodeLogic(node: TextNode): boolean {
    for (const name of Object.keys(MapNameFunction)) {
      if (node.text === name) {
        return true;
      }
    }
    for (const name of Object.keys(MapOtherFunction)) {
      if (node.text === name) {
        return true;
      }
    }
    return false;
  }

  /**
   * 手动执行选中的逻辑节点
   */
  export function executeSelectedLogicNodes(): void {
    const selectedNodes = StageManager.getSelectedEntities().filter(
      (entity) => entity instanceof TextNode && isTextNodeLogic(entity),
    ) as TextNode[];

    if (selectedNodes.length === 0) {
      console.log("没有选中的逻辑节点");
      return;
    }

    // 检查是否有聊天节点正在执行
    const chatNodes = selectedNodes.filter(
      (node) => node.text === LogicNodeNameEnum.CHAT_CONTENT || node.text === LogicNodeNameEnum.CHAT_SYSTEM_CONTENT,
    );

    for (const chatNode of chatNodes) {
      // 对于聊天节点，检查其输出节点是否正在执行
      const childNodes = AutoComputeUtils.getChildTextNodes(chatNode);
      if (childNodes.length > 0) {
        const outputNode = childNodes[0];
        if (NodeLogic.isChatNodeExecuting(outputNode.uuid)) {
          console.log(`聊天节点 ${chatNode.uuid} 的输出节点正在执行中，跳过执行`);
          // 从选中节点中移除正在执行的聊天节点
          const index = selectedNodes.indexOf(chatNode);
          if (index > -1) {
            selectedNodes.splice(index, 1);
          }
        }
      }
    }

    // 按位置排序执行
    const sortedNodes = sortEntityByLocation(selectedNodes) as TextNode[];

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      computeTextNode(node);
      Stage.effectMachine.addEffect(TextRaiseEffectLocated.fromDebugLogicNode(i, node.geometryCenter));
    }

    // 增加步数计数器
    NodeLogic.step++;
  }

  /**
   * 按y轴从上到下排序，如果y轴相同，则按照x轴从左到右排序
   */
  function sortEntityByLocation(entities: any[]): any[] {
    return entities.sort((a, b) => {
      const yDiff = a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y;
      if (yDiff === 0) {
        return a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x;
      }
      return yDiff;
    });
  }

  /**
   * 运行一个节点的计算
   */
  function computeTextNode(node: TextNode) {
    for (const name of Object.keys(MapNameFunction)) {
      if (node.text === name) {
        Stage.effectMachine.addEffect(RectangleLittleNoteEffect.fromUtilsLittleNote(node));
        const result = MapNameFunction[name](AutoComputeUtils.getParentTextNodes(node).map((p) => p.text));
        AutoComputeUtils.generateMultiResult(node, result);
      }
    }

    // 特殊类型计算
    for (const name of Object.keys(MapOtherFunction)) {
      if (node.text === name) {
        if (name === LogicNodeNameEnum.DELAY_COPY) {
          const result = MapOtherFunction[name](
            [...AutoComputeUtils.getParentEntities(node), node],
            AutoComputeUtils.getChildTextNodes(node),
          );
          AutoComputeUtils.generateMultiResult(node, result);
          continue;
        }
        const result = MapOtherFunction[name](
          AutoComputeUtils.getParentEntities(node),
          AutoComputeUtils.getChildTextNodes(node),
        );
        AutoComputeUtils.generateMultiResult(node, result);
      }
    }
  }
}
