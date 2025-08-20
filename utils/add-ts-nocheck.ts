import fs from "fs";
import path from "path";

const files: string[] = [
  "src/components/ui/ai-toolbar-button.tsx",
  "src/components/ui/block-discussion.tsx",
  "src/components/ui/block-selection.tsx",
  "src/components/ui/blockquote-node-static.tsx",
  "src/components/ui/callout-node-static.tsx",
  "src/components/ui/code-block-node-static.tsx",
  "src/components/ui/code-node-static.tsx",
  "src/components/ui/code-node.tsx",
  "src/components/ui/column-node-static.tsx",
  "src/components/ui/column-node.tsx",
  "src/components/ui/comment-node-static.tsx",
  "src/components/ui/comment-node.tsx",
  "src/components/ui/comment-toolbar-button.tsx",
  "src/components/ui/comment.tsx",
  "src/components/ui/date-node-static.tsx",
  "src/components/ui/editor-static.tsx",
  "src/components/ui/equation-node-static.tsx",
  "src/components/ui/equation-node.tsx",
  "src/components/ui/floating-toolbar.tsx",
  "src/components/ui/font-size-toolbar-button.tsx",
  "src/components/ui/heading-node.tsx",
  "src/components/ui/highlight-node-static.tsx",
  "src/components/ui/highlight-node.tsx",
  "src/components/ui/history-toolbar-button.tsx",
  "src/components/ui/hr-node-static.tsx",
  "src/components/ui/hr-node.tsx",
  "src/components/ui/inline-combobox.tsx",
  "src/components/ui/kbd-node-static.tsx",
  "src/components/ui/kbd-node.tsx",
  "src/components/ui/link-node-static.tsx",
  "src/components/ui/link-node.tsx",
  "src/components/ui/link-toolbar.tsx",
  "src/components/ui/media-audio-node-static.tsx",
  "src/components/ui/media-audio-node.tsx",
  "src/components/ui/media-file-node-static.tsx",
  "src/components/ui/media-file-node.tsx",
  "src/components/ui/media-image-node-static.tsx",
  "src/components/ui/media-image-node.tsx",
  "src/components/ui/media-toolbar-button.tsx",
  "src/components/ui/media-toolbar.tsx",
  "src/components/ui/media-video-node-static.tsx",
  "src/components/ui/media-video-node.tsx",
  "src/components/ui/paragraph-node-static.tsx",
  "src/components/ui/paragraph-node.tsx",
  "src/components/ui/suggestion-node-static.tsx",
  "src/components/ui/suggestion-toolbar-button.tsx",
  "src/components/ui/table-node.tsx",
  "src/components/ui/toc-node-static.tsx",
  "src/components/ui/toc-node.tsx",
  "src/components/ui/toggle-node-static.tsx",
  "src/components/ui/toggle-node.tsx",
  "src/components/ui/turn-into-toolbar-button.tsx",
];

files.forEach((relPath) => {
  const filePath = path.join("app", relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.startsWith("// @ts-nocheck")) {
    fs.writeFileSync(filePath, `// @ts-nocheck\n${content}`);
    console.log(`Added @ts-nocheck to: ${filePath}`);
  } else {
    console.log(`Already has @ts-nocheck: ${filePath}`);
  }
});
