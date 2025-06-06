// In src/utils/aiUtils.ts
/**
 * Represents a part of a Gemini API request, containing text.
 */
interface GeminiPart {
  text: string;
}
/**
 * Represents the content for a Gemini API request, consisting of parts and an optional role.
 */
interface GeminiContent {
  parts: GeminiPart[];
  role?: string; // role is optional, default to 'user' if needed or omit
}
/**
 * Represents the overall structure for the 'contents' field in a Gemini API request.
 */
export interface GeminiRequestContents {
  contents: GeminiContent[];
}

/**
 * Creates the 'contents' part of a Gemini API request object.
 * This function is used to format a prompt string into the structure
 * expected by the Gemini API's `generateContent` method.
 *
 * @param prompt The text prompt to be included in the request.
 * @returns An object structured for the Gemini API `contents` field.
 */
export function createGeminiContentJson(prompt: string): GeminiRequestContents {
  return {
    contents: [{ parts: [{ text: prompt }] /*, role: 'user' */ }], // Consider if 'role' should be hardcoded or configurable
  };
}
