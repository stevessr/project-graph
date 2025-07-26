import { IAIEngine, ChatMessage, ChatOptions, AIModel } from "../IAIEngine";
import { universalFetch } from "../../../../../utils/fetch";
import { Settings } from "../../../Settings";
import { AITools } from "../AITools";

export function applyCustomSystemMessage(messages: ChatMessage[], customSystemMessage: string): ChatMessage[] {
  if (!customSystemMessage) {
    return messages;
  }

  const systemMessageExists = messages.length > 0 && messages[0].role === "system";

  if (systemMessageExists) {
    const newMessages = [...messages];
    newMessages[0] = { ...newMessages[0], content: customSystemMessage };
    return newMessages;
  } else {
    return [{ role: "system", content: customSystemMessage }, ...messages];
  }
}

export class OpenAIEngine implements IAIEngine {
  private apiKey: string = "";
  private baseURL: string = "https://api.openai.com/v1";

  public async updateConfig(config: { apiKey?: string; baseUrl?: string }): Promise<void> {
    if (config.baseUrl) {
      this.baseURL = config.baseUrl;
    }
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
    const enableStream = await Settings.get("enableStream");
    const openaiResponseType = await Settings.get("openaiResponseType");
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
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
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
      if (openaiResponseType === "response") {
        yield JSON.stringify(completion);
      } else {
        yield completion.choices[0]?.message?.content || "";
      }
    }
  }

  async getModels(): Promise<AIModel[]> {
    const response = await universalFetch(`${this.baseURL}/models`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const resp = await response.json();
    return resp.data
      .map((it: { id: string }) => ({
        id: it.id,
        name: it.id,
        vendor: "OpenAI",
      }))
      .sort((a: AIModel, b: AIModel) => a.id.localeCompare(b.id));
  }
}
