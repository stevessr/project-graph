import { describe, test, expect } from "vitest";
import { createGeminiContentJson } from "../../src/services/aiApiService";

import { ApiConfig } from "../../src/types/aiSettings";

describe("createGeminiContentJson", () => {
  test("should create correct Gemini content JSON for a given prompt", () => {
    const prompt = "Hello, world!";
    // Provide a mock ApiConfig to satisfy the function's requirements.
    const mockApiConfig: Partial<ApiConfig> = {
      temperature: 0.7,
    };

    const result = createGeminiContentJson(prompt, mockApiConfig as ApiConfig);

    // The expected output should now include the generationConfig.
    const expectedOutput = {
      contents: [{ parts: [{ text: "Hello, world!" }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 1.0,
      },
    };

    expect(result).toEqual(expectedOutput);
  });
});
