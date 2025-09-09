import { Dialog } from "@/components/ui/dialog";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";

/**
 * 包含编辑节点文字，编辑详细信息等功能的控制器
 *
 * 当有节点编辑时，会把摄像机锁定住
 */
export class ControllerEdgeEditClass extends ControllerClass {
  mouseDoubleClick = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const firstHoverEdge = this.project.mouseInteraction.firstHoverEdge;
    const firstHoverMultiTargetEdge = this.project.mouseInteraction.firstHoverMultiTargetEdge;
    if (!(firstHoverEdge || firstHoverMultiTargetEdge)) {
      return;
    }
    if (firstHoverEdge) {
      // 编辑边上的文字
      this.project.controllerUtils.editEdgeText(firstHoverEdge);
    }
    if (firstHoverMultiTargetEdge) {
      this.project.controllerUtils.editMultiTargetEdgeText(firstHoverMultiTargetEdge);
    }

    return;
  };

  keydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const selectedEdges = this.project.stageManager.getLineEdges().filter((edge) => edge.isSelected);
      if (selectedEdges.length === 1) {
        setTimeout(() => {
          this.project.controllerUtils.editEdgeText(selectedEdges[0]);
        }); // delay 默认 1ms，防止多输入一个回车
      } else if (selectedEdges.length === 0) {
        return;
      } else {
        Dialog.input("编辑所有选中的边").then((result) => {
          if (!result) return;
          selectedEdges.forEach((edge) => {
            edge.rename(result);
          });
        });
      }
    }
  };
}
