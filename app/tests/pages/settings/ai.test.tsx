import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AISettingsPage from "../../../src/pages/settings/ai";
import { useAiSettingsStore } from "../../../src/state/aiSettingsStore";
import { AiSettings } from "../../../src/types/aiSettings";

// Mock the store and i18n
vi.mock("../../../src/state/aiSettingsStore");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

const mockUseAiSettingsStore = vi.mocked(useAiSettingsStore);

describe("AISettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSaveSettings = vi.fn().mockResolvedValue(undefined);
    mockUseAiSettingsStore.mockReturnValue({
      aiSettings: {
        api_configs: [],
        active_config_id: null,
        prompt_collections: null,
        summary_prompt: null,
        custom_prompts: null,
      } as AiSettings,
      saveSettings: mockSaveSettings,
      loadAiSettings: vi.fn().mockResolvedValue(undefined), // Added for completeness
      setActiveAiConfig: vi.fn().mockResolvedValue(undefined), // Added for completeness
      fetchModels: vi.fn(),
      addAiConfig: vi.fn(),
      updateAiConfig: vi.fn(),
      deleteAiConfig: vi.fn(),
      // switchActiveApiConfig: vi.fn(), // This seems to be a typo, setActiveAiConfig is likely intended
      createPromptCollection: vi.fn(),
      savePromptVersion: vi.fn(),
      updatePromptVersion: vi.fn(),
      deletePromptVersion: vi.fn(),
      updateSummaryPrompt: vi.fn(),
      availableModels: [],
      loadingModels: false,
      error: null,
      // getState: () => ({ // Ensure getState also returns the mocked functions if accessed this way
      //   aiSettings: {
      //     api_configs: [],
      //     active_config_id: null,
      //     prompt_collections: null,
      //     summary_prompt: null,
      //     custom_prompts: null,
      //   } as AiSettings,
      //   saveSettings: mockSaveSettings,
      //   loadAiSettings: vi.fn().mockResolvedValue(undefined),
      //   setActiveAiConfig: vi.fn().mockResolvedValue(undefined),
      //   fetchModels: vi.fn(),
      //   addAiConfig: vi.fn(),
      //   updateAiConfig: vi.fn(),
      //   deleteAiConfig: vi.fn(),
      //   createPromptCollection: vi.fn(),
      //   savePromptVersion: vi.fn(),
      //   updatePromptVersion: vi.fn(),
      //   deletePromptVersion: vi.fn(),
      //   updateSummaryPrompt: vi.fn(),
      //   availableModels: [],
      //   loadingModels: false,
      //   error: null,
      // })
    } as any); // Use 'as any' to simplify mocking complex store types
  });

  it("should render the manual save button", () => {
    render(<AISettingsPage />);
    expect(screen.getByRole("button", { name: /Manual Save/i })).toBeInTheDocument();
  });

  it("should call saveSettings and show loading state when manual save button is clicked", async () => {
    const { saveSettings: mockSaveSettingsFromStore } = mockUseAiSettingsStore(); // Get the mocked function
    const saveSettingsPromise = new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
    vi.mocked(mockSaveSettingsFromStore).mockReturnValue(saveSettingsPromise);

    render(<AISettingsPage />);

    const saveButton = screen.getByRole("button", { name: /Manual Save/i });
    fireEvent.click(saveButton);

    // Check for loading state
    expect(saveButton).toBeDisabled();
    // The button text changes to "Saving..." which is handled by the component's state,
    // so we check for the new text within the button.
    expect(screen.getByRole("button", { name: /Saving.../i })).toBeInTheDocument();

    // Wait for the save to complete
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    // Check that the store method was called
    expect(mockSaveSettingsFromStore).toHaveBeenCalledTimes(1);

    // Check that the button text is restored
    expect(screen.getByRole("button", { name: /Manual Save/i })).toBeInTheDocument();
  });
});
