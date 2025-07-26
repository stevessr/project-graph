import { IAIEngine, ChatMessage, ChatOptions, AIModel } from "../IAIEngine";
import { universalFetch } from "../../../../../utils/fetch";
import { Settings } from "../../../Settings";

export class AnthropicEngine implements IAIEngine {
  private apiKey: string = "";
  private baseUrl: string = "https://api.anthropic.com/v1";

  public async updateConfig(config: { apiKey?: string; baseUrl?: string }): Promise<void> {
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
    const finalSystemMessage = options.systemMessage ?? (await Settings.get("customSystemMessage"));

    const requestBody: any = {
      model: options.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: 4096,
      stream: true,
    };

    if (finalSystemMessage) {
      requestBody.system = finalSystemMessage;
    }

    const response = await universalFetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last partial line

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.substring(5).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta.type === "text_delta") {
              yield parsed.delta.text;
            }
          } catch (e) {
            console.error("Failed to parse SSE chunk:", data, e);
          }
        }
      }
    }
  }

  async getModels(): Promise<AIModel[]> {
    // Hardcoded models for now
    return [
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", vendor: "Anthropic" },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", vendor: "Anthropic" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", vendor: "Anthropic" },
    ];
  }
}
