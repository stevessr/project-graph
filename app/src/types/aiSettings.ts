// src\types\aiSettings.ts
export interface ApiConfig {
  id: string;
  name: string;
  provider: string; // e.g., "openai", "anthropic", "gemini", "local_ai"
  api_key: string;
  base_url: string; // Optional, as some providers might not need it or have a default
  model: string;
  temperature?: number;
  max_tokens?: number;
  notes?: string; // Added based on potential future use, optional
}

export interface PromptContentNode {
  text: string;
  children?: PromptContentNode[] | null;
  // node_type and params from the old PromptNode could be added here if still relevant
  // For now, sticking to the provided JSON structure for "content"
}

export interface PromptVersion {
  content: PromptContentNode;
  timestamp: number;
}

export interface PromptCollection {
  name: string;
  versions: PromptVersion[];
}

export interface AiSettings {
  api_configs: ApiConfig[];
  active_config_id: string;
  prompt_collections: Record<string, PromptCollection> | null;
  summary_prompt: string | null;
  custom_prompts: string | null;
}

export interface ResposeContent {
  text?: string;
  type: string;
  detail?: string;
  fileId?: string;
  imageUrl?: string;
  fileData?: string;
  filename?: string;
}
