import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAiSettingsStore } from "../../src/state/aiSettingsStore";
import { loggingService } from "../../src/services/loggingService";
import * as persistenceService from "../../src/services/persistenceService";
import { AiSettings } from "../../src/types/aiSettings";

// Mock the services using vitest
vi.mock("../../src/services/loggingService");
vi.mock("../../src/services/persistenceService");

const mockLoggingService = loggingService as unknown as {
  log: ReturnType<typeof vi.fn>;
};
const mockPersistenceService = persistenceService as unknown as {
  save: ReturnType<typeof vi.fn>;
};

describe("aiSettingsStore", () => {
  beforeEach(() => {
    // Reset mocks and the store's state before each test
    vi.clearAllMocks();
    useAiSettingsStore.setState({
      aiSettings: null,
      isLoading: false,
      error: null,
      availableModels: [],
      loadingModels: false,
    });
  });

  describe("saveAiSettings", () => {
    it("should save settings and log the action", async () => {
      const settingsToSave: AiSettings = {
        api_configs: [],
        active_config_id: null,
        prompt_collections: null,
        summary_prompt: null,
        custom_prompts: null,
      };

      // Get the save function from the store
      const { saveAiSettings } = useAiSettingsStore.getState();

      // Call the save function
      await saveAiSettings(settingsToSave);

      // Verify that the persistence service was called
      expect(mockPersistenceService.save).toHaveBeenCalledWith("ai_settings", settingsToSave);

      // Verify that the logging service was called
      expect(mockLoggingService.log).toHaveBeenCalledWith("info", "AI settings saved successfully.", {
        settings: settingsToSave,
      });

      // Verify that the store state was updated
      const state = useAiSettingsStore.getState();
      expect(state.aiSettings).toEqual(settingsToSave);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("saveSettings", () => {
    it("should call saveAiSettings with the current settings", async () => {
      const currentSettings: AiSettings = {
        api_configs: [
          {
            id: "1",
            name: "test",
            provider: "openai",
            api_key: "key",
            model: "gpt-4",
            base_url: "https://api.openai.com/v1",
          },
        ],
        active_config_id: "1",
        prompt_collections: null,
        summary_prompt: "summary",
        custom_prompts: null,
      };
      useAiSettingsStore.setState({ aiSettings: currentSettings });

      // Spy on the saveAiSettings action
      const saveAiSettingsSpy = vi.spyOn(useAiSettingsStore.getState(), "saveAiSettings");

      await useAiSettingsStore.getState().saveSettings();

      expect(saveAiSettingsSpy).toHaveBeenCalledWith(currentSettings);

      // Restore the spy
      saveAiSettingsSpy.mockRestore();
    });

    it("should not do anything if settings are null", async () => {
      useAiSettingsStore.setState({ aiSettings: null });

      const saveAiSettingsSpy = vi.spyOn(useAiSettingsStore.getState(), "saveAiSettings");

      await useAiSettingsStore.getState().saveSettings();

      expect(saveAiSettingsSpy).not.toHaveBeenCalled();

      saveAiSettingsSpy.mockRestore();
    });

    it("should return a promise that resolves when saving is complete", async () => {
      const settings: AiSettings = {
        api_configs: [],
        active_config_id: null,
        prompt_collections: null,
        summary_prompt: null,
        custom_prompts: null,
      };
      useAiSettingsStore.setState({ aiSettings: settings });

      // Make saveAiSettings return a promise that we can track
      const savePromise = new Promise<void>((resolve) => setTimeout(resolve, 50));
      vi.spyOn(useAiSettingsStore.getState(), "saveAiSettings").mockReturnValue(savePromise);

      let hasResolved = false;
      const saveOperation = useAiSettingsStore
        .getState()
        .saveSettings()
        .then(() => {
          hasResolved = true;
        });

      expect(hasResolved).toBe(false);
      await saveOperation;
      expect(hasResolved).toBe(true);
    });
  });
});
