// In src/services/aiApiService.ts
import { fetch } from "../utils/tauriApi";

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
  const payload: OpenAIRequest = {
    model,
    input,
  };

  if (model.startsWith("o") && reasoningEffort) {
    payload.reasoning = { effort: reasoningEffort };
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
 * @returns An object structured for the Gemini API.
 */
export const createGeminiContentJson = (prompt: string) => {
  return {
    contents: [{ parts: [{ text: prompt }] }],
  };
};
