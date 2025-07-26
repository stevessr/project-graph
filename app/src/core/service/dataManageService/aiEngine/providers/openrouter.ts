import { IAIEngine, ChatMessage, ChatOptions, AIModel } from "../IAIEngine";
import { universalFetch } from "../../../../../utils/fetch";
import { Settings } from "../../../Settings";
import { AITools } from "../AITools";
import { applyCustomSystemMessage } from "./openai";

let keyIndex = 0;

export class OpenRouterEngine implements IAIEngine {
  private apiKeys: string[] = [];
  private baseURL: string = "https://openrouter.ai/api/v1";

  public async updateConfig(config: { apiKey?: string; baseUrl?: string }): Promise<void> {
    if (config.baseUrl) {
      this.baseURL = config.baseUrl;
    }
    if (config.apiKey) {
      this.apiKeys = config.apiKey.split("\n").filter((it) => it.trim());
    }
  }

  private getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      return "";
    }
    const key = this.apiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % this.apiKeys.length;
    return key;
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getNextApiKey()}`,
    };
  }

  async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
    const enableStream = await Settings.get("enableStream");
    const finalSystemMessage = options.systemMessage ?? (await Settings.get("customSystemMessage"));

    const processedMessages = applyCustomSystemMessage(messages, finalSystemMessage);

    const requestBody = {
      messages: processedMessages,
      model: options.model,
      tools: AITools.tools,
      stream: enableStream,
    };

    const response = await universalFetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (enableStream) {
      if (!response.body) {
        throw new Error("Response body is null for stream");
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
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield parsed.choices[0]?.delta?.content || "";
            } catch (e) {
              console.error("Failed to parse stream data:", e);
            }
          }
        }
      }
    } else {
      const completion = await response.json();
      yield completion.choices[0]?.message?.content || "";
    }
  }

  async getModels(): Promise<AIModel[]> {
    const response = await universalFetch(`${this.baseURL}/models`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const resp = await response.json();
    return resp.data
      .map((it: any) => ({
        id: it.id,
        name: it.name,
        vendor: it.id.split("/")[0],
      }))
      .sort((a: AIModel, b: AIModel) => a.vendor.localeCompare(b.vendor) || a.name.localeCompare(b.name));
  }
}