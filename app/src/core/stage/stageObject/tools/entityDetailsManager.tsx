import { createPlateEditor } from "platejs/react";
import { Entity } from "../abstract/StageEntity";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { FixedToolbarKit } from "@/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { MarkdownPlugin } from "@platejs/markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Value } from "platejs";

/**
 * 详细信息管理器
 */
export class DetailsManager {
  constructor(private entity: Entity) {}

  public isEmpty() {
    if (this.entity.details.length === 0) {
      return true;
    } else {
      const firstItem = this.entity.details[0];
      if (firstItem.type === "p") {
        const firstChildren = firstItem.children[0];
        if (firstChildren.text === "") {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 获取这个详细信息能被搜索到的字符串
   * @returns
   */
  public getBeSearchingText(): string {
    if (this.isEmpty()) {
      return "";
    } else {
      return JSON.stringify(this.entity.details);
    }
  }

  public static detailsToMarkdown(details: Value) {
    const result: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    details.entries().forEach(([_, tElement]) => {
      result.push(JSON.stringify(tElement));
    });
    return result.join("\n");
  }

  public static markdownToDetails(md: string) {
    const editor = createPlateEditor({
      plugins: [
        ...FloatingToolbarKit,
        ...FixedToolbarKit,
        ...BasicMarksKit,
        ...BasicBlocksKit,
        ...FontKit,
        ...TableKit,
        ...MathKit,
        ...CodeBlockKit,
        ...ListKit,
        ...LinkKit,
        MarkdownPlugin,
      ],
    });
    const value = editor.api.markdown.deserialize(md, {
      remarkPlugins: [remarkGfm, remarkMath, remarkBreaks],
    });
    return value;
  }

  // TODO:
  public static mergeDetails(detailsList: Value[]): Value {
    return detailsList[0];
  }
}
