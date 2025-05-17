export interface ApiConfig {
  id: string;
  name: string;
  endpoint_url: string;
  api_key: string;
  default_model: string | null;
  api_type: string;
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
