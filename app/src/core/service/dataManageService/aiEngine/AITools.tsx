import { Project } from "@/core/Project";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color } from "@graphif/data-structures";
import { serialize } from "@graphif/serializer";
import OpenAI from "openai";
import z from "zod/v4";

export namespace AITools {
  export const tools: OpenAI.ChatCompletionTool[] = [];
  export const handlers: Map<string, (project: Project, data: any) => any> = new Map();

  function addTool<A extends z.ZodObject>(
    name: string,
    description: string,
    parameters: A,
    fn: (project: Project, data: z.infer<A>) => any,
  ) {
    tools.push({
      type: "function",
      function: {
        name,
        description,
        parameters: z.toJSONSchema(parameters),
        strict: true,
      },
    });
    handlers.set(name, fn);
  }

  addTool("get_all_nodes", "获取所有节点以及uuid", z.object({}), (project) => serialize(project.stage));
  addTool("delete_node", "根据uuid删除节点", z.object({ uuid: z.string() }), (project, { uuid }) => {
    project.stageManager.delete(project.stageManager.get(uuid)!);
    project.historyManager.recordStep();
  });
  addTool(
    "edit_text_node",
    "根据uuid编辑TextNode",
    z.object({
      uuid: z.string(),
      data: z.object({
        text: z.string().optional(),
        color: z.array(z.number()).optional().describe("[255,255,255,1]"),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    }),
    (project, { uuid, data }) => {
      const node = project.stageManager.get(uuid);
      if (!(node instanceof TextNode)) return;
      node.text = data.text ?? node.text;
      node.color = data.color ? new Color(...(data.color as [number, number, number, number])) : node.color;
      project.historyManager.recordStep();
    },
  );
}
