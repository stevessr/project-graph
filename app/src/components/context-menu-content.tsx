import { Button } from "@/components/ui/button";
import { ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeProjectAtom } from "@/state";
import { useAtom } from "jotai";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  Asterisk,
  Box,
  Clipboard,
  Copy,
  Dot,
  Package,
  Scissors,
  SquareRoundCorner,
  TextSelect,
  Trash,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import KeyTooltip from "./key-tooltip";

const Content = ContextMenuContent;
const Item = ContextMenuItem;
// const Sub = ContextMenuSub;
// const SubTrigger = ContextMenuSubTrigger;
// const SubContent = ContextMenuSubContent;
// const Separator = ContextMenuSeparator;

export default function MyContextMenuContent() {
  const [p] = useAtom(activeProjectAtom);
  const { t } = useTranslation("contextMenu");
  if (!p) return <></>;

  return (
    <Content>
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="copy">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.copy()}>
            <Copy />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="paste">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.paste()}>
            <Clipboard />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="cut">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.cut()}>
            <Scissors />
          </Button>
        </KeyTooltip>
        {p.stageManager.getSelectedStageObjects().length > 0 && (
          <KeyTooltip keyId="deleteSelectedStageObjects">
            <Button variant="ghost" size="icon" onClick={() => p.stageManager.deleteSelectedStageObjects()}>
              <Trash className="text-destructive" />
            </Button>
          </KeyTooltip>
        )}
      </Item>
      {p.stageManager.getSelectedEntities().length >= 2 && (
        <>
          <Item className="bg-transparent! gap-0 p-0">
            <div className="grid min-w-0 grid-cols-3 grid-rows-3">
              <KeyTooltip keyId="alignLeft">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManualAlign.alignLeft()}>
                  <AlignStartVertical />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignCenterVertical">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => p.layoutManualAlign.alignCenterVertical()}
                >
                  <AlignCenterVertical />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignRight">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManualAlign.alignRight()}>
                  <AlignEndVertical />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignTop">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManualAlign.alignTop()}>
                  <AlignStartHorizontal />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignCenterHorizontal">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => p.layoutManualAlign.alignCenterHorizontal()}
                >
                  <AlignCenterHorizontal />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignBottom">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => p.layoutManualAlign.alignBottom()}
                >
                  <AlignEndHorizontal />
                </Button>
              </KeyTooltip>
              <KeyTooltip keyId="alignHorizontalSpaceBetween">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => p.layoutManualAlign.alignHorizontalSpaceBetween()}
                >
                  <AlignHorizontalSpaceBetween />
                </Button>
              </KeyTooltip>
              <div />
              <KeyTooltip keyId="alignVerticalSpaceBetween">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => p.layoutManualAlign.alignVerticalSpaceBetween()}
                >
                  <AlignVerticalSpaceBetween />
                </Button>
              </KeyTooltip>
            </div>
          </Item>
          <Item onClick={() => p.stageManager.packEntityToSectionBySelected()}>
            <Box />
            {t("packToSection")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              p.stageManager.add(edge);
            }}
          >
            <Asterisk />
            {t("createMTUEdgeLine")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              edge.renderType = "convex";
              p.stageManager.add(edge);
            }}
          >
            <SquareRoundCorner />
            {t("createMTUEdgeConvex")}
          </Item>
        </>
      )}
      {p.stageManager.getSelectedStageObjects().length === 0 && (
        <>
          <Item
            onClick={() =>
              p.controllerUtils.addTextNodeByLocation(p.renderer.transformView2World(MouseLocation.vector()), true)
            }
          >
            <TextSelect />
            {t("createTextNode")}
          </Item>
          <Item
            onClick={() => p.controllerUtils.createConnectPoint(p.renderer.transformView2World(MouseLocation.vector()))}
          >
            <Dot />
            {t("createConnectPoint")}
          </Item>
        </>
      )}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode).length > 0 && (
        <>
          <Item
            onClick={() =>
              p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof TextNode)
                .map((it) => p.sectionPackManager.targetTextNodeToSection(it))
            }
          >
            <Package />
            {t("convertToSection")}
          </Item>
        </>
      )}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof Section).length > 0 && (
        <>
          <Item onClick={() => p.stageManager.sectionSwitchCollapse()}>
            <Package />
            {t("toggleSectionCollapse")}
          </Item>
        </>
      )}
    </Content>
  );
}
