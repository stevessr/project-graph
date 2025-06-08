import { describe, test, expect } from "vitest";
import { createGeminiContentJson } from "../../src/services/aiApiService";

describe("createGeminiContentJson", () => {
  test("should create correct Gemini content JSON for a given prompt", () => {
    const prompt = "Hello, world!";
    const expectedOutput = {
      contents: [{ parts: [{ text: "Hello, world!" }] }],
    };
    const result = createGeminiContentJson(prompt);
    expect(result).toEqual(expectedOutput);
  });
});
