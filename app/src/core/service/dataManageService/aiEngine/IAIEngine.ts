/**
 * @file Defines the interface for an AI engine service provider.
 */

/**
 * Represents a single message in a chat conversation.
 */
export interface ChatMessage {
  /**
   * The role of the author of this message.
   */
  role: "user" | "assistant" | "system" | "tool";
  /**
   * The content of the message.
   */
  content: string;
}

export interface AIModel {
  id: string;
  name: string;
  vendor: string;
}

/**
 * Represents the options for a chat request.
 */
export interface ChatOptions {
  /**
   * The specific provider to use for this request.
   */
  provider?: string;
  /**
   * The name of the model to use for the chat.
   */
  model: string;
  /**
   * A list of tools the model can use.
   */
  tools?: any[]; // TODO: Define a more specific type for tools
  /**
   * Whether to stream the response.
   */
  stream?: boolean;
  /**
   * The maximum number of tokens to generate.
   */
  max_tokens?: number;
  /**
   * The temperature to use for sampling.
   */
  temperature?: number;
  /**
   * The top-p value to use for nucleus sampling.
   */
  top_p?: number;
  /**
   * The top-k value to use for nucleus sampling.
   */
  top_k?: number;
  /**
   * An optional system message to be used for the session.
   */
  systemMessage?: string;
}

/**
 * Interface for an AI Engine, providing a unified contract for various AI service providers.
 */
export interface IAIEngine {
  /**
   * Updates the configuration for the AI engine.
   * @param config - An object containing the new configuration, such as the API key and base URL.
   * @TDD-ANCHOR updateConfig
   */
  updateConfig(config: { apiKey?: string; baseUrl?: string; [key: string]: any }): Promise<void>;

  /**
   * Sends a chat request to the AI model and streams the response.
   * @param messages - An array of chat messages representing the conversation history.
   * @param options - An object containing additional parameters for the chat request, such as the model name and tools.
   * @returns An async generator that yields the AI's response as a stream of strings.
   * @TDD-ANCHOR chat
   */
  chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string>;

  /**
   * Retrieves a list of available model names from the AI service provider.
   * @returns A promise that resolves to an array of AIModel objects, each representing an available model.
   * @TDD-ANCHOR getModels
   */
  getModels(): Promise<AIModel[]>;

  /**
   * Generates text-to-speech audio from the given text.
   * This is an experimental feature and may not be supported by all providers.
   * @param text - The text to synthesize.
   * @param voiceName - The name of the voice to use for generation.
   * @returns A promise that resolves to an ArrayBuffer containing the audio data.
   * @TDD-ANCHOR generateTTS
   */
  generateTTS?(text: string, voiceName: string): Promise<ArrayBuffer>;
}
