export interface AiSettings {
  api_configs: ApiConfig[];
  active_config_id: string | null;
  prompt_collections: Record<string, PromptCollection> | null;
  summary_prompt: string | null;
  custom_prompts: string | null;
}

export interface McpTool {
  type: "mcp";
  server_label: string;
  server_url: string;
  require_approval: string;
}

export interface ApiConfig {
  id: string;
  name: string;
  provider: string; // e.g., "openai", "anthropic", "gemini", "ollama", "groq"
  api_key: string;
  base_url: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  thinkingBudget?: number;
  thinking?: {
    enabled: boolean;
    budget_tokens: number;
  };
  notes?: string;
  tools?: McpTool[];
}

export interface PromptCollection {
  name: string;
  versions: PromptVersion[];
}

export interface PromptVersion {
  content: PromptNode;
  timestamp: number; // Unix timestamp in milliseconds
}

export interface PromptNode {
  text: string;
  node_type?: string;
  params?: Record<string, any>; // 对应 serde_json::Value
  children?: PromptNode[];
}

export interface Model {
  id: string;
  name: string;
}
