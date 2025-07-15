import { PromptContentNode } from "../../../types/aiSettings";

// Parses the line format string into PromptNode array
export const parseLineFormat = (text: string): PromptContentNode[] | null => {
  if (!text || !text.trim()) {
    return null;
  }
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const nodes: PromptContentNode[] = [];
  lines.forEach((line) => {
    const parts = line.split(":");
    const parentText = parts[0]?.trim();
    if (!parentText) return; // Skip lines without parent text

    const parentNode: PromptContentNode = { text: parentText, children: null };
    if (parts.length > 1 && parts[1]?.trim()) {
      const childTexts = parts[1]
        .split(/[,、]/)
        .map((t) => t.trim())
        .filter((t) => t);
      if (childTexts.length > 0) {
        parentNode.children = childTexts.map((childText) => ({ text: childText }));
      }
    }
    nodes.push(parentNode);
  });
  return nodes.length > 0 ? nodes : null;
};

// Formats PromptContentNode array back into the line format string
export const formatNodesToLineString = (nodes: PromptContentNode[] | null): string => {
  if (!nodes) {
    return "";
  }
  return nodes
    .map((node) => {
      let line = node.text;
      if (node.children && node.children.length > 0) {
        line += ": " + node.children.map((child) => child.text).join(", "); // Use comma as standard separator
      }
      return line;
    })
    .join("\n");
};
