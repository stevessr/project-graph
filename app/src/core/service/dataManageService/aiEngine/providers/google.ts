import { IAIEngine, ChatMessage, ChatOptions, AIModel } from "../IAIEngine";
import { universalFetch } from "../../../../../utils/fetch";
import { Settings } from "../../../Settings";

function applySystemMessageForGoogle(messages: ChatMessage[], systemMessage: string): ChatMessage[] {
  if (!systemMessage) {
    return messages;
  }

  const firstUserMessageIndex = messages.findIndex((msg) => msg.role === "user");

  if (firstUserMessageIndex !== -1) {
    const newMessages = [...messages];
    newMessages[firstUserMessageIndex] = {
      ...newMessages[firstUserMessageIndex],
      content: `${systemMessage}\n\n${newMessages[firstUserMessageIndex].content}`,
    };
    return newMessages;
  }

  return messages;
}

// Define Content and other necessary types that were previously imported from the SDK
interface Content {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  thinkingConfig?: {
    thinkingBudget: number;
    include_thoughts?: boolean;
  };
}

export class GoogleEngine implements IAIEngine {
  private apiKey: string | null = null;
  private baseUrl: string = "https://generativelanguage.googleapis.com";
  private geminiTtsModel: string = "gemini-1.5-flash";
  private language: string = "en-US";

  public async updateConfig(options: {
    apiKey?: string;
    baseUrl?: string;
    geminiTtsModel?: string;
    language?: string;
  }) {
    if (options.apiKey && options.apiKey !== "YOUR_GOOGLE_API_KEY") {
      this.apiKey = options.apiKey;
      if (options.baseUrl) {
        this.baseUrl = options.baseUrl;
      }
      if (options.geminiTtsModel) {
        this.geminiTtsModel = options.geminiTtsModel;
      }
      if (options.language) {
        this.language = options.language;
      }
    } else {
      if (options.apiKey === "YOUR_GOOGLE_API_KEY") {
        console.error(
          "Google API Key is a placeholder. Please replace it with your actual key. The GoogleEngine is disabled.",
        );
      } else {
        console.error("Google API Key not found or is empty. The GoogleEngine is disabled.");
      }
      this.apiKey = null;
    }
  }

  private formatMessagesForGoogle(messages: ChatMessage[]): Content[] {
    // Filter out system messages and map roles
    const filteredMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        ...message,
        role: message.role === "assistant" ? "model" : "user",
      }));

    if (filteredMessages.length === 0) {
      return [];
    }

    const mergedMessages: { role: "user" | "model"; content: string }[] = [];
    let currentRole = filteredMessages[0].role;
    let currentContent: string[] = [];

    for (const message of filteredMessages) {
      if (message.role === currentRole) {
        currentContent.push(message.content);
      } else {
        mergedMessages.push({
          role: currentRole as "user" | "model",
          content: currentContent.join("\n\n"),
        });
        currentRole = message.role;
        currentContent = [message.content];
      }
    }
    mergedMessages.push({
      role: currentRole as "user" | "model",
      content: currentContent.join("\n\n"),
    });

    // Ensure history starts with a user message
    const finalMessages = mergedMessages;
    if (finalMessages.length > 0 && finalMessages[0].role === "model") {
      finalMessages.shift(); // Remove leading model message
    }

    // Ensure user and model roles alternate, starting with user.
    const alternatingMessages: { role: "user" | "model"; content: string }[] = [];
    let lastRole: "user" | "model" | null = null;

    // Find the first user message to start the conversation
    const firstUserIndex = finalMessages.findIndex((m) => m.role === "user");

    if (firstUserIndex === -1) {
      return []; // No user messages, history is invalid
    }

    // Start from the first user message and alternate roles
    for (let i = firstUserIndex; i < finalMessages.length; i++) {
      const message = finalMessages[i];
      if (alternatingMessages.length === 0 && message.role === "user") {
        alternatingMessages.push(message);
        lastRole = "user";
      } else if (lastRole === "user" && message.role === "model") {
        alternatingMessages.push(message);
        lastRole = "model";
      } else if (lastRole === "model" && message.role === "user") {
        alternatingMessages.push(message);
        lastRole = "user";
      }
    }

    return alternatingMessages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    }));
  }

  async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error(
        "Google AI Engine is not initialized. " +
          "This can happen if 'updateConfig' was not called or was called with an invalid API key. " +
          "Please ensure the engine is configured correctly before use.",
      );
    }

    const finalSystemMessage = options.systemMessage ?? (await Settings.get("customSystemMessage"));
    const processedMessages = applySystemMessageForGoogle(messages, finalSystemMessage);

    const contents = this.formatMessagesForGoogle(processedMessages);
    if (contents.length === 0) {
      return;
    }

    const generationConfig: GenerationConfig = {
      maxOutputTokens: options.max_tokens,
      temperature: options.temperature,
      topP: options.top_p,
      topK: options.top_k,
    };

    const googleEnableThinkingConfig = await Settings.get("googleEnableThinkingConfig");
    if (googleEnableThinkingConfig) {
      const googleThinkingBudget = await Settings.get("googleThinkingBudget");
      generationConfig.thinkingConfig = {
        thinkingBudget: googleThinkingBudget,
        include_thoughts: true,
      };
    }

    const enableStream = options.stream !== false;
    const model = options.model;
    const url = `${this.baseUrl}/v1beta/models/${model}:${enableStream ? "streamGenerateContent" : "generateContent"}`;

    const enableCodeExecution = await Settings.get("googleEnableCodeExecution");
    const enableUrlContext = await Settings.get("googleEnableUrlContext");
    const enableGoogleSearch = await Settings.get("googleEnableGoogleSearch");

    const tools = [];
    if (enableCodeExecution) {
      tools.push({ code_execution: {} });
    }
    if (enableUrlContext) {
      tools.push({ url_context: {} });
    }
    if (enableGoogleSearch) {
      tools.push({ google_search: {} });
    }

    const body: any = {
      contents,
      generationConfig,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    if (tools.length > 0) {
      body.tools = tools;
    }

    const response = await universalFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Google AI API Error:", errorBody);
      throw new Error(`Google AI API request failed with status ${response.status}: ${errorBody}`);
    }

    if (enableStream) {
      if (!response.body) {
        throw new Error("Response body is null for streaming.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        // It's possible for a single chunk to contain multiple data events, or a partial event.
        // We'll split by newline and process each line.
        const lines = buffer.split("\n");
        // The last line might be incomplete, so we keep it in the buffer for the next chunk.
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(5).trim();
              // According to the spec, the stream can start with [S] and end with [E]
              if (jsonStr === "[S]" || jsonStr === "[E]") continue;
              const chunk = JSON.parse(jsonStr);
              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
              }
            } catch (e) {
              console.error("Failed to parse stream chunk JSON:", line, e);
            }
          }
        }
      }
    } else {
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield text;
      } else {
        // Handle cases where the response might be valid but not contain text, e.g., safety blocks
        const finishReason = result.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== "STOP") {
          console.warn(`Google AI response finished with reason: ${finishReason}`);
          const safetyRatings = result.candidates?.[0]?.safetyRatings;
          if (safetyRatings) {
            console.warn("Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
          }
        }
      }
    }
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.apiKey) {
      return [];
    }
    try {
      const url = `${this.baseUrl}/v1beta/models`;
      const response = await universalFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": this.apiKey!,
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch models from Google AI. Status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.models) {
        return [];
      }

      return data.models.map((model: any) => ({
        id: model.name.replace("models/", ""),
        name: model.displayName,
        vendor: "Google",
      }));
    } catch (error) {
      console.error("Error fetching Google AI models:", error);
      return [];
    }
  }

  async generateTTS(text: string, voiceName: string): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error("Google AI Engine is not initialized for TTS.");
    }

    const url = `${this.baseUrl}/v1beta/models/${this.geminiTtsModel}:synthesizeSpeech`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: text,
            },
          ],
        },
      ],
      // The new endpoint expects a `model` field in the request body.
      model: this.geminiTtsModel,
      audioConfig: {
        audioEncoding: "LINEAR16",
      },
      voice: {
        languageCode: this.language,
        name: voiceName,
      },
      generationConfig: {
        responseModalities: ["AUDIO"],
      },
    };

    const response = await universalFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey!,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Google TTS API Error:", errorBody);
      throw new Error(`Google TTS API request failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const audioData = result.audioContent;

    if (!audioData) {
      throw new Error("No audio data received from Google TTS API.");
    }

    // Base64 decode the audio data
    const byteCharacters = atob(audioData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return byteArray.buffer;
  }
}
