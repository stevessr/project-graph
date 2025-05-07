import { z } from "zod";

// 定义与后端 Rust 结构体对应的 TypeScript 类型

export interface PromptNode {
  text: string;
  node_type?: string;
  params?: any; // Use any for serde_json::Value for simplicity
  children?: PromptNode[];
}

export interface PromptVersion {
  content: PromptNode;
  timestamp: number; // i64 in Rust maps to number in TS
}

export interface PromptCollection {
  name: string;
  versions: PromptVersion[];
}

export interface AiSettings {
  api_endpoint?: string;
  api_key?: string;
  selected_model?: string;
  prompt_collections?: Record<string, PromptCollection>; // HashMap<String, PromptCollection> in Rust
  api_type?: string;
  summary_prompt?: string;
  // custom_prompts?: PromptNode[]; // Temporarily keep for potential frontend migration handling if needed, but not part of the target structure
}

// 定义 Zod schema for the types
const PromptNodeSchema: z.ZodSchema<PromptNode> = z.lazy(() =>
  z.object({
    text: z.string(),
    node_type: z.string().optional(),
    params: z.any().optional(), // Use z.any() for serde_json::Value
    children: z.array(PromptNodeSchema).optional(),
  }),
);

const PromptVersionSchema: z.ZodSchema<PromptVersion> = z.object({
  content: PromptNodeSchema,
  timestamp: z.number(),
});

const PromptCollectionSchema: z.ZodSchema<PromptCollection> = z.object({
  name: z.string(),
  versions: z.array(PromptVersionSchema),
});

const AiSettingsSchema: z.ZodSchema<AiSettings> = z.object({
  api_endpoint: z.string().optional(),
  api_key: z.string().optional(),
  selected_model: z.string().optional(),
  prompt_collections: z.record(z.string(), PromptCollectionSchema).optional(),
  api_type: z.string().optional(),
  summary_prompt: z.string().optional(),
  // custom_prompts: z.array(PromptNodeSchema).optional(), // Temporarily keep for potential frontend migration handling
});

// 定义允许插件调用的 API 方法类型
export const apiTypes = {
  hello: [[z.string()], z.void()],
  getCameraLocation: [[], z.tuple([z.number(), z.number()])],
  setCameraLocation: [[z.number(), z.number()], z.void()],
  getPressingKey: [[], z.array(z.string())],
  openDialog: [[z.string(), z.string()], z.void()],
  // Add AI related commands
  load_ai_settings: [[], AiSettingsSchema], // Returns AiSettings
  save_ai_settings: [[AiSettingsSchema], z.void()], // Takes AiSettings
  save_prompt_version: [[z.string(), PromptNodeSchema], z.void()], // Takes prompt_name and content
} as const;

type Zod2Interface<T> = {
  [K in keyof T]: T[K] extends readonly [
    // 第一个元素：参数列表
    infer Args extends readonly z.ZodTypeAny[],
    // 第二个元素：返回值类型
    infer Return extends z.ZodTypeAny,
  ]
    ? (
        ...args: {
          // 对每个参数使用z.infer
          [L in keyof Args]: Args[L] extends z.ZodTypeAny ? z.infer<Args[L]> : never;
        }
      ) => z.infer<Return>
    : never;
};

export type Asyncize<T extends (...args: any[]) => any> = (...args: Parameters<T>) => Promise<ReturnType<T>>;
export type AsyncizeInterface<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Asyncize<T[K]> : never;
};
export type SyncOrAsyncizeInterface<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Asyncize<T[K]> | T[K] : never;
};

export type PluginAPI = Zod2Interface<typeof apiTypes>;
export type PluginAPIMayAsync = SyncOrAsyncizeInterface<PluginAPI>;

// 消息通信协议类型

/**
 * 插件发送给主进程的消息类型
 */
export type CallAPIMessage = {
  type: "callAPIMethod";
  payload: {
    method: keyof typeof apiTypes;
    args: any[];
    reqId: string;
  };
};

/**
 * 主进程响应给插件的消息类型
 */
export type APIResponseMessage = {
  type: "apiResponse";
  payload: {
    reqId: string;
    result?: any;
    error?: string;
  };
};
