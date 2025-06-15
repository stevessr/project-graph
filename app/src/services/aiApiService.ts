// In src/services/aiApiService.ts
import { fetch } from "../utils/tauriApi";
import { ApiConfig } from "../types/aiSettings";
import { useAiSettingsStore } from "../state/aiSettingsStore";
import { makeApiCall } from "../core/ai/helpers/apiCaller";
import { buildChatExpansionRequest as openaiRequestBuilder } from "../core/ai/helpers/openaiRequestBuilder";
import { buildGeminiExpansionRequest as geminiRequestBuilder } from "../core/ai/helpers/geminiRequestBuilder";
import { buildClaudeExpansionRequest as claudeRequestBuilder } from "../core/ai/helpers/claudeRequestBuilder";
// import { BuildApiRequestResult , ApiRequestDetails } from "../core/ai/helpers/types";

/**
 * Represents a single message in the input for an OpenAI-compatible API request.
 */
export interface OpenAIInput {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
}

/**
 * Represents the payload for an OpenAI-compatible API request.
 */
export interface OpenAIRequest {
  model: string;
  input: OpenAIInput[];
  reasoning?: {
    effort: "low" | "medium" | "high";
  };
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
}

/**
 * Dynamically calls the appropriate AI service based on the active configuration.
 * @param prompt The user prompt.
 * @param stream Whether to stream the response.
 * @returns The AI's response as a string or an async generator of strings.
 */
export function callAiApi(prompt: string, stream: true): AsyncGenerator<string>;
export function callAiApi(prompt: string, stream?: false): Promise<string>;
export function callAiApi(prompt: string, stream?: boolean): AsyncGenerator<string> | Promise<string> {
  const getActiveConfig = () => {
    const { aiSettings } = useAiSettingsStore.getState();
    const activeConfig =
      aiSettings && aiSettings.active_config_id
        ? aiSettings.api_configs.find((c) => c.id === aiSettings.active_config_id)
        : undefined;

    if (!activeConfig) {
      throw new Error("No active AI configuration found.");
    }
    return activeConfig;
  };

  const buildRequest = (activeConfig: ApiConfig, promptText: string) => {
    const { provider } = activeConfig;
    const messages = [{ role: "user", content: promptText }];

    const getResult = () => {
      switch (provider) {
        case "openai":
          return openaiRequestBuilder(activeConfig, messages);
        case "gemini":
          return geminiRequestBuilder(activeConfig, messages, null as any);
        case "anthropic":
          return claudeRequestBuilder(activeConfig, messages);
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    };

    const result = getResult();

    if (!result) {
      throw new Error("Request builder returned a falsy value.");
    }

    // Type guard for success case
    if (
      "apiUrl" in result &&
      result.apiUrl &&
      "requestBody" in result &&
      result.requestBody &&
      "requestHeaders" in result &&
      result.requestHeaders
    ) {
      return {
        apiUrl: result.apiUrl,
        requestBody: result.requestBody,
        requestHeaders: result.requestHeaders,
        provider,
      };
    }

    // Handle error case
    if ("error" in result && result.error) {
      const errorMsg = `Failed to build API request: ${result.error}`;
      throw new Error(errorMsg);
    }

    // Fallback for unexpected result shape
    const errorMsg = "Failed to build API request: Invalid or incomplete result from builder.";
    throw new Error(errorMsg);
  };

  if (stream) {
    return (async function* () {
      const activeConfig = getActiveConfig();
      const { apiUrl, requestBody, requestHeaders } = buildRequest(activeConfig, prompt);
      (requestBody as any).stream = true;

      const response = await makeApiCall(apiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
      }

      if (!response.body) {
        throw new Error("Response body is null, cannot stream.");
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
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data.trim() === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const text =
                parsed.choices?.[0]?.delta?.content ||
                parsed.candidates?.[0]?.content.parts[0].text ||
                parsed.delta?.text ||
                "";
              if (text) {
                yield text;
              }
            } catch {
              // In case of parsing error, we just ignore the chunk.
            }
          }
        }
      }
    })();
  } else {
    return (async () => {
      const activeConfig = getActiveConfig();
      const { apiUrl, requestBody, requestHeaders, provider } = buildRequest(activeConfig, prompt);

      const response = await makeApiCall(apiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      if (provider === "openai" && responseData.choices?.[0]?.message?.content) {
        return responseData.choices[0].message.content;
      } else if (provider === "gemini" && responseData.candidates?.[0]?.content.parts[0].text) {
        return responseData.candidates[0].content.parts[0].text;
      } else if (provider === "anthropic" && responseData.content?.[0]?.text) {
        return responseData.content[0].text;
      }
      return JSON.stringify(responseData);
    })();
  }
}

/**
 * Creates the payload for an OpenAI-compatible API request.
 *
 * @param model The model to use for the request.
 * @param input An array of message objects.
 * @returns An object structured for the OpenAI-compatible API.
 */
export function createOpenAIRequestPayload(
  model: string,
  input: OpenAIInput[],
  reasoningEffort?: "low" | "medium" | "high",
): OpenAIRequest {
  const { aiSettings } = useAiSettingsStore.getState();
  const activeConfig =
    aiSettings && aiSettings.active_config_id
      ? aiSettings.api_configs.find((c) => c.id === aiSettings.active_config_id)
      : undefined;

  const payload: OpenAIRequest = {
    model,
    input,
  };

  if (model.startsWith("o") && reasoningEffort) {
    payload.reasoning = { effort: reasoningEffort };
  }

  // Add Claude-specific thinking parameter if enabled
  if (activeConfig?.provider === "anthropic" && activeConfig.thinking?.enabled) {
    payload.thinking = {
      type: "enabled",
      budget_tokens: activeConfig.thinking.budget_tokens,
    };
  }

  return payload;
}

/**
 * Sends a request to an OpenAI-compatible API.
 *
 * @param url The API endpoint URL.
 * @param key The API key for authorization.
 * @param body The request payload.
 * @returns A promise that resolves to the JSON response from the server.
 */
export const sendOpenAIRequest = async (url: string, key: string, body: OpenAIRequest) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
};

/**
 * Fetches AI models from a specified URL with an API key.
 *
 * @param url The URL to fetch the models from.
 * @param key The API key for authorization.
 * @returns A promise that resolves to the JSON response from the server.
 */
export const fetchAiModels = async (url: string, key: string) => {
  const headers: HeadersInit = {};
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
};

/**
 * Creates a JSON object for Gemini API content.
 *
 * @param prompt The text prompt to include in the content.
 * @param apiConfig The API configuration containing generation settings.
 * @returns An object structured for the Gemini API.
 */
export const createGeminiContentJson = (prompt: string, apiConfig: ApiConfig) => {
  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: apiConfig.temperature ?? 0.7,
      topP: 1.0,
    },
  };

  if (typeof apiConfig.thinkingBudget === "number") {
    payload.generationConfig.thinkingConfig = {
      thinkingBudget: apiConfig.thinkingBudget,
    };
  }

  return payload;
};
