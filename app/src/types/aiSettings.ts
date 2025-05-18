// src\types\aiSettings.ts
export interface ApiConfig {
  id: string;
  name: string;
  provider: string; // e.g., "openai", "anthropic", "gemini", "local_ai"
  apiKey: string;
  baseUrl?: string; // Optional, as some providers might not need it or have a default
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
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
  active_config_id: string | null;
  prompt_collections: Record<string, PromptCollection> | null;
  summary_prompt: string | null;
  custom_prompts: string | null;
}

export interface ResposeContent {
  text?: string;
  type: string;
  detail?: string;
  file_id?: string;
  image_url?: string;
  file_data?: string;
  filename?: string;
}
