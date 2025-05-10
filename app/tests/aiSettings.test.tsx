// tests/aiSettings.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import AI from "../src/pages/settings/ai"; // Adjust path assuming tests are in project_graph/app/tests/
import type { AiSettings } from "../src/pages/settings/ai"; // Import type

// Mock tauriApi
const mockInvoke = vi.fn();
const mockFetch = vi.fn();
// Adjust path based on actual file structure: if ai.tsx is src/pages/settings/ai.tsx
// and this test file is tests/aiSettings.test.tsx, the relative path is correct.
vi.mock("../src/utils/tauriApi", () => ({
  invoke: mockInvoke,
  fetch: mockFetch,
}));

// Mock Dialog
const mockDialogShow = vi.fn();
vi.mock("../src/components/dialog", () => ({
  Dialog: {
    show: mockDialogShow,
  },
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options && typeof options === "object") {
        let message = String(key); // Ensure key is a string
        for (const optKey in options) {
          if (Object.prototype.hasOwnProperty.call(options, optKey)) {
            const value = String(options[optKey]); // Ensure value is a string
            message = message.replace(new RegExp(`{{${optKey}}}`, "g"), value);
          }
        }
        return message;
      }
      return String(key); // Ensure key is a string
    },
  }),
}));

const defaultAiSettings: AiSettings = {
  api_endpoint: null,
  api_key: null,
  selected_model: null,
  prompt_collections: {},
  api_type: "chat",
  summary_prompt: null,
  custom_prompts: null,
};

describe("AI Settings Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for fetch (used by fetchModels)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }), // Default empty models
    });
    // Mock Dialog.show to resolve to avoid issues if it's called
    mockDialogShow.mockResolvedValue({ button: "Ok" });
  });

  test("Scenario 1: Config file does not exist - creates default and loads successfully", async () => {
    // This test assumes the frontend (ai.tsx) contains the fix:
    // try { load } catch { if (file_not_found) { save_default; load_again; } }

    mockInvoke
      .mockImplementationOnce(async (command: string) => {
        // First call to load_ai_settings
        if (command === "load_ai_settings") {
          console.log("Mock invoke: load_ai_settings (1st call) - throwing 'file not found' error");
          const error = new Error("Mocked: OS error 2 - No such file or directory");
          // Simulate Tauri error structure if known, or a specific marker
          (error as any).message = "handler error: os error 2"; // More specific to how Tauri might report
          throw error;
        }
        return {};
      })
      .mockImplementationOnce(async (command: string, args: any) => {
        // Call to save_ai_settings by frontend
        if (command === "save_ai_settings") {
          console.log("Mock invoke: save_ai_settings called with", args.settings);
          expect(args.settings).toEqual(defaultAiSettings); // 1a. Confirm default config is saved
          return Promise.resolve();
        }
        return {};
      })
      .mockImplementationOnce(async (command: string) => {
        // Second call to load_ai_settings by frontend
        if (command === "load_ai_settings") {
          console.log("Mock invoke: load_ai_settings (2nd call) - returning default settings");
          return Promise.resolve(defaultAiSettings); // 1b. Confirm AI settings load successfully
        }
        return {};
      });

    render(<AI />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("load_ai_settings"); // First call
      // Check if save_ai_settings was called (by the component's error handling logic)
      expect(mockInvoke).toHaveBeenCalledWith("save_ai_settings", { settings: defaultAiSettings });
      // Check if load_ai_settings was called again
      expect(mockInvoke).toHaveBeenLastCalledWith("load_ai_settings"); // Should be the third invoke call in this sequence
      expect(mockInvoke).toHaveBeenCalledTimes(3); // load, save, load
    });

    // 1b. Confirm AI settings load successfully (with defaults) - Check UI element
    // Check API Type (should be default 'chat')
    const apiTypeSelect = await screen.findByRole("combobox", {
      name: (content, element) => element?.getAttribute("name") === "api_type",
    });
    expect(apiTypeSelect).toHaveValue("chat");

    // 1c. Confirm no error is shown to the UI.
    // Query for error message based on translation key or part of it
    expect(screen.queryByText((content) => content.startsWith("ai.loadFailure"))).not.toBeInTheDocument();
    expect(screen.queryByText(/Mocked: OS error 2/i)).not.toBeInTheDocument();
  });

  test("Scenario 2: Config file exists - loads existing settings correctly", async () => {
    // 2a. Confirm system correctly loads existing settings.
    // 2b. Confirm not incorrectly overriding existing settings.
    const existingSettings: AiSettings = {
      api_endpoint: "http://localhost:1234",
      api_key: "test-key",
      selected_model: "test-model-001",
      prompt_collections: { myPrompt: { name: "myPrompt", versions: [] } },
      api_type: "responses",
      summary_prompt: "Summarize this for me",
      custom_prompts: "My custom prompt line here",
    };

    mockInvoke.mockImplementationOnce(async (command: string) => {
      if (command === "load_ai_settings") {
        console.log("Mock invoke: load_ai_settings (existing file) - returning existing settings");
        return Promise.resolve(existingSettings);
      }
      return {};
    });

    // Mock fetchModels to return the selected_model so it can be found in the dropdown
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "test-model-001" }, { id: "other-model" }] }),
    });

    render(<AI />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith("load_ai_settings");
      // save_ai_settings should NOT be called
      expect(mockInvoke).not.toHaveBeenCalledWith("save_ai_settings", expect.anything());
    });

    // Check if existing settings are reflected in the UI
    const endpointInput = await screen.findByRole("textbox", {
      name: (content, element) => element?.getAttribute("name") === "api_endpoint",
    });
    expect(endpointInput).toHaveValue(existingSettings.api_endpoint!);

    const apiKeyInput = await screen.findByRole("textbox", {
      name: (content, element) => element?.getAttribute("name") === "api_key",
    });
    expect(apiKeyInput).toHaveValue(existingSettings.api_key!);

    const apiTypeSelect = await screen.findByRole("combobox", {
      name: (content, element) => element?.getAttribute("name") === "api_type",
    });
    expect(apiTypeSelect).toHaveValue(existingSettings.api_type!);

    const modelSelect = await screen.findByRole("combobox", {
      name: (content, element) => element?.getAttribute("name") === "selected_model",
    });
    expect(modelSelect).toHaveValue(existingSettings.selected_model!);

    const summaryPromptInput = await screen.findByRole("textbox", {
      name: (content, element) => element?.getAttribute("name") === "summary_prompt",
    });
    expect(summaryPromptInput).toHaveValue(existingSettings.summary_prompt!);

    const customPromptsTextarea = await screen.findByRole("textbox", {
      name: (content, element) => element?.getAttribute("name") === "custom_prompts_string",
    });
    expect(customPromptsTextarea).toHaveValue(existingSettings.custom_prompts!); // Assuming custom_prompts maps to customPromptsString

    // Confirm no error is shown
    expect(screen.queryByText((content) => content.startsWith("ai.loadFailure"))).not.toBeInTheDocument();
  });
});
