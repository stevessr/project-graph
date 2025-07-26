export const availableProviders = ["google", "openai", "anthropic", "openrouter"] as const;
export type AIProvider = typeof availableProviders[number];

export interface UserContent {
  text: string;
  // TODO: Add support for images or other media
}

export interface UserMessage {
  id: string;
  role: 'user';
  contentHistory: UserContent[];
  activeVersionIndex: number;
}

export interface AIResponse {
  text: string;
  // TODO: Add metadata, like confidence scores or citations
}

export interface AIMessage {
  id: string;
  role: 'assistant';
  responses: AIResponse[];
  activeResponseIndex: number;
  isLoading?: boolean;
}

export type ChatMessage = UserMessage | AIMessage;