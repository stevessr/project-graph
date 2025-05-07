import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  ArrowDownUp,
  ArrowLeftRight,
  ChevronsRightLeft,
  Columns4,
  Grid3x3,
  LayoutGrid,
  LayoutTemplate,
  Magnet,
  Maximize2,
  MoveHorizontal,
  Network,
  SquareSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "../../components/dialog";
import { Settings } from "../../core/service/Settings";
import { GraphMethods } from "../../core/stage/stageManager/basicMethods/GraphMethods";
import { Stage } from "../../core/stage/Stage";
import { ConnectableEntity } from "../../core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "../../core/stage/stageObject/abstract/StageEntity";
import { cn } from "../../utils/cn";
import { ToolbarItem } from "../_toolbar";
import { StageAutoAlignManager } from "../../core/stage/stageManager/concreteMethods/StageAutoAlignManager";
import { StageSectionPackManager } from "../../core/stage/stageManager/concreteMethods/StageSectionPackManager";
import { TextNode } from "../../core/stage/stageObject/entity/TextNode";
import { AutoLayoutFastTree } from "../../core/service/controlService/autoLayoutEngine/autoLayoutFastTreeMode";
import { LayoutManualAlignManager } from "../../core/stage/stageManager/concreteMethods/layoutManager/layoutManualAlignManager";
import { LayoutToSquareManager } from "../../core/stage/stageManager/concreteMethods/layoutManager/layoutToSquareManager";
import { LayoutSectionManager } from "../../core/stage/stageManager/concreteMethods/layoutManager/layoutSectionManager";
import { LayoutResizeManager } from "../../core/stage/stageManager/concreteMethods/layoutManager/layoutResizeManager";

/**
 * 对齐面板
 * @returns
 */
export default function AlignNodePanel() {
  const [isEnableDragAutoAlign, setEnableDragAutoAlign] = useState(false);
  const [isEnableDragToGridAutoAlign, setEnableDragToGridAutoAlign] = useState(false);

  useEffect(() => {
    Settings.watch("enableDragAutoAlign", (value) => {
      setEnableDragAutoAlign(value);
    });
    Settings.watch("enableDragAlignToGrid", (value) => {
      setEnableDragToGridAutoAlign(value);
    });
  }, []);
  const cell9ClassName = "border-1 bg-panel-bg grid grid-cols-3 grid-rows-3 rounded p-1 m-1";

  const isSelectedIsTreeRoot = (handleTreeRootFunc: (root: ConnectableEntity) => void) => {
    return () => {
      const selected = Stage.stageManager.getSelectedEntities();
      if (selected.length !== 1) {
        Dialog.show({
          title: "选择节点数量不正确",
          content: "必须只选择一个根节点才可以进行树形结构布局，且连接的节点必须符合树形结构",
        });
        return;
      }
      const selectedEntity = selected[0];
      if (selectedEntity instanceof ConnectableEntity) {
        if (GraphMethods.isTree(selectedEntity)) {
          handleTreeRootFunc(selectedEntity);
        } else {
          Dialog.show({
            title: "连接的节点必须符合树形结构",
            content: "连接的节点必须符合树形结构，不能有环路，不能有重叠指向",
          });
        }
      } else {
        Dialog.show({
          title: "选择的对象必须是可连线的节点对象",
          content: "必须只选择一个根节点才可以进行树形结构布局，且连接的节点必须符合树形结构",
        });
      }
    };
  };

  return (
    <div className="grid grid-cols-3 grid-rows-2">
      <div className={cell9ClassName}>
        <div />
        <ToolbarItem
          description="顶对齐 (88)"
          icon={<AlignStartHorizontal />}
          handleFunction={() => {
            LayoutManualAlignManager.alignTop();
          }}
        />
        <div />
        <ToolbarItem
          description="左对齐 (44)"
          icon={<AlignStartVertical />}
          handleFunction={() => {
            LayoutManualAlignManager.alignLeft();
          }}
        />
        <div />
        <ToolbarItem
          description="右对齐 (66)"
          icon={<AlignEndVertical />}
          handleFunction={() => {
            LayoutManualAlignManager.alignRight();
          }}
        />
        <div />
        <ToolbarItem
          description="底对齐 (22)"
          icon={<AlignEndHorizontal />}
          handleFunction={() => {
            LayoutManualAlignManager.alignBottom();
          }}
        />
        <div />
      </div>

      <div className={cell9ClassName}>
        <ToolbarItem
          description="相等间距垂直对齐 (8282)"
          icon={<AlignVerticalSpaceBetween />}
          handleFunction={() => {
            LayoutManualAlignManager.alignVerticalSpaceBetween();
          }}
        />
        <div />
        <ToolbarItem
          description="相等间距水平对齐 (4646)"
          icon={<AlignHorizontalSpaceBetween />}
          handleFunction={() => {
            LayoutManualAlignManager.alignHorizontalSpaceBetween();
          }}
        />
        <ToolbarItem
          description="中心垂直对齐 (582)"
          icon={<AlignCenterVertical />}
          handleFunction={() => {
            LayoutManualAlignManager.alignCenterVertical();
          }}
        />
        <div />
        <ToolbarItem
          description="中心水平对齐 (546)"
          icon={<AlignCenterHorizontal />}
          handleFunction={() => {
            LayoutManualAlignManager.alignCenterHorizontal();
          }}
        />
        <ToolbarItem
          description="向下紧密堆积 (852)"
          icon={<AlignVerticalJustifyStart />}
          handleFunction={() => {
            LayoutManualAlignManager.alignTopToBottomNoSpace();
          }}
        />
        <div />
        <ToolbarItem
          description="向右紧密堆积 (456)"
          icon={<AlignHorizontalJustifyStart />}
          handleFunction={() => {
            LayoutManualAlignManager.alignLeftToRightNoSpace();
          }}
        />
      </div>
      <div className={cell9ClassName}>
        <div />
        <ToolbarItem
          description="上下反转树位置"
          icon={<ArrowDownUp />}
          handleFunction={isSelectedIsTreeRoot(AutoLayoutFastTree.treeReverseY)}
        />
        <div />
        <ToolbarItem
          description="左右反转树位置"
          icon={<ArrowLeftRight />}
          handleFunction={isSelectedIsTreeRoot(AutoLayoutFastTree.treeReverseX)}
        />
        <div />
        <ToolbarItem
          description="向右自动树形布局"
          icon={<Network className="-rotate-90" />}
          handleFunction={isSelectedIsTreeRoot(StageAutoAlignManager.autoLayoutSelectedFastTreeModeRight)}
        />
        <div />
        <ToolbarItem
          description="向下自动树形布局（点击一次布局一层）"
          icon={<Network />}
          handleFunction={isSelectedIsTreeRoot(StageAutoAlignManager.autoLayoutSelectedFastTreeModeDown)}
        />
        <div />
      </div>
      <div className={cell9ClassName}>
        <ToolbarItem
          description="尽可能排列成正方形"
          icon={<LayoutGrid />}
          handleFunction={() => {
            LayoutToSquareManager.layoutToSquare();
          }}
        />
        <ToolbarItem
          description="排一串"
          icon={<Columns4 />}
          handleFunction={() => {
            LayoutToSquareManager.layoutToTightSquare();
          }}
        />
        <ToolbarItem
          description="将树形结构变成框嵌套结构"
          icon={<SquareSquare />}
          handleFunction={() => {
            const selectedNodes = Stage.stageManager
              .getSelectedEntities()
              .filter((node: Entity) => node instanceof TextNode);
            if (selectedNodes.length !== 1) {
              Dialog.show({
                title: "选择节点数量不为1",
                content: "必须只选择一个根节点才可以进行树形结构变成框嵌套结构",
              });
              return;
            }
            StageSectionPackManager.textNodeTreeToSection(selectedNodes[0]);
          }}
        />
        <ToolbarItem
          description="将选中的框和实体 密集堆积 （还在开发中）"
          icon={<LayoutTemplate />}
          handleFunction={() => {
            const selectedNodes = Stage.stageManager
              .getSelectedEntities()
              .filter((node: Entity) => node instanceof TextNode);
            if (selectedNodes.length === 1) {
              return;
            }
            LayoutSectionManager.defaultLayout();
          }}
        />
        <ToolbarItem
          description={isEnableDragAutoAlign ? "拖动吸附对齐：开启" : "拖动吸附对齐：关闭"}
          icon={<Magnet className={cn(!isEnableDragAutoAlign && "text-panel-details-text", "transition-transform")} />}
          handleFunction={async () => {
            Settings.set("enableDragAutoAlign", !(await Settings.get("enableDragAutoAlign")));
          }}
        />
        <ToolbarItem
          description={isEnableDragToGridAutoAlign ? "网格吸附对齐：开启" : "网格吸附对齐：关闭"}
          icon={
            <Grid3x3
              className={cn(!isEnableDragToGridAutoAlign && "text-panel-details-text", "transition-transform")}
            />
          }
          handleFunction={async () => {
            Settings.set("enableDragAlignToGrid", !(await Settings.get("enableDragAlignToGrid")));
          }}
        />
      </div>
      <div className={cell9ClassName}>
        <div />
        <ToolbarItem
          description={"统一宽度，以最小宽度为准"}
          icon={<ChevronsRightLeft />}
          handleFunction={async () => {
            LayoutResizeManager.adjustSelectedTextNodeWidth("minWidth");
          }}
        />
        <div />
        <div />
        <ToolbarItem
          description={"统一宽度，以平均宽度为准"}
          icon={<MoveHorizontal />}
          handleFunction={async () => {
            LayoutResizeManager.adjustSelectedTextNodeWidth("average");
          }}
        />
        <div />
        <div />
        <ToolbarItem
          description={"统一宽度，以最大宽度为准"}
          icon={<Maximize2 className="rotate-45" />}
          handleFunction={async () => {
            LayoutResizeManager.adjustSelectedTextNodeWidth("maxWidth");
          }}
        />
        <div />
      </div>
    </div>
  );
}
