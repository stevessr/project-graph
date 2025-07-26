import { describe, it, expect, afterEach, vi } from "vitest";
import { AIEngine } from "./AIEngine";
import { OpenAIEngine } from "./providers/openai";
import { Settings } from "../../Settings";

vi.mock("../../Settings");

describe("AIEngine", () => {
  afterEach(() => {
    // @ts-expect-error - Resetting private static instance for test isolation
    AIEngine.instance = undefined;
    vi.clearAllMocks();
  });

  it("should return an instance of OpenAIEngine when provider is set to openai", async () => {
    (Settings.get as import("vitest").Mock).mockResolvedValue("openai");

    const instance = await AIEngine.getInstance();

    expect(instance).toBeInstanceOf(OpenAIEngine);
  });
});
