import { Button } from "@/components/ui/button";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
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
  Package,
  Plus,
  Scissors,
  TextSelect,
  Trash,
} from "lucide-react";
import KeyTooltip from "./key-tooltip";

const Content = ContextMenuContent;
const Item = ContextMenuItem;
const Sub = ContextMenuSub;
const SubTrigger = ContextMenuSubTrigger;
const SubContent = ContextMenuSubContent;
// const Separator = ContextMenuSeparator;

export default function MyContextMenuContent() {
  const [p] = useAtom(activeProjectAtom);
  if (!p) return <></>;

  return (
    <Content>
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="copy">
          <Button variant="ghost" size="icon">
            <Copy />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="paste">
          <Button variant="ghost" size="icon">
            <Clipboard />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="cut">
          <Button variant="ghost" size="icon">
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
            打包为 Section
          </Item>
          <Sub>
            <SubTrigger>
              <Plus />
              创建关系
            </SubTrigger>
            <SubContent>
              <Item>
                <Asterisk />
                无源多向边
              </Item>
            </SubContent>
          </Sub>
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
            新建文本节点
          </Item>
          <Sub>
            <SubTrigger>
              <Plus />
              新建节点
            </SubTrigger>
            <SubContent>
              {/* <Item
                onClick={() =>
                  p.controllerUtils.createConnectPoint(p.renderer.transformView2World(MouseLocation.vector()))
                }
              >
                <Dot />
                质点
              </Item> */}
              <Item>待完善...</Item>
            </SubContent>
          </Sub>
        </>
      )}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode).length > 0 && (
        <>
          <Item
            onClick={() =>
              p.stageManager.getSelectedEntities().map((it) => p.sectionPackManager.targetTextNodeToSection(it))
            }
          >
            <Package />
            {p.stageManager.getSelectedEntities().length >= 2 && "分别"}转换为 Section
          </Item>
        </>
      )}
    </Content>
  );
}
