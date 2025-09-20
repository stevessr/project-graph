import { Project } from "@/core/Project";
import { Vector } from "@graphif/data-structures";
import { readFile } from "@tauri-apps/plugin-fs";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Rectangle } from "@graphif/shapes";

/**
 * 处理文件拖拽到舞台的引擎
 */
export namespace DragFileIntoStageEngine {
  /**
   * 处理文件拖拽到舞台
   * @param project 当前活动的项目
   * @param pathList 拖拽的文件路径列表
   * @param mouseLocation 拖拽到的位置（舞台坐标系）
   */
  export async function handleDrop(project: Project, pathList: string[], mouseLocation: Vector) {
    try {
      for (const filePath of pathList) {
        // 检查文件是否为PNG格式
        if (!filePath.toLowerCase().endsWith(".png")) {
          console.warn(`不支持的文件格式: ${filePath}`);
          continue;
        }

        // 使用Tauri的文件系统API读取文件内容
        const fileData = await readFile(filePath);
        console.log(`读取文件成功: ${filePath}, 大小: ${fileData.length} bytes`);

        // 创建Blob对象
        const blob = new Blob([fileData], { type: "image/png" });
        console.log(`创建Blob成功: ${blob.size} bytes, type: ${blob.type}`);

        // 添加到项目的attachments中
        const attachmentId = project.addAttachment(blob);
        console.log(`添加附件成功, ID: ${attachmentId}`);

        // 创建ImageNode并添加到舞台
        const imageNode = new ImageNode(project, {
          attachmentId,
          collisionBox: new CollisionBox([
            new Rectangle(project.renderer.transformView2World(mouseLocation), new Vector(300, 150)),
          ]),
        });

        project.stageManager.add(imageNode);
        console.log(`创建ImageNode成功并添加到舞台, UUID: ${imageNode.uuid}`);
      }
    } catch (error) {
      console.error(`处理拖拽文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
