import { create, StoreApi, UseBoundStore } from "zustand";
import type { AiSettings, ApiConfig, Model } from "../types/aiSettings";
import { save, load } from "../services/persistenceService";
import { loggingService } from "../services/loggingService";
import { fetchAiModels } from "../services/aiApiService";
import { parseLineFormat } from "../pages/settings/ai/promptUtils";

const AI_SETTINGS_KEY = "ai_settings";

interface AiSettingsState {
  aiSettings: AiSettings | null;
  isLoading: boolean;
  error: string | null;
  availableModels: Model[];
  loadingModels: boolean;
  loadAiSettings: () => Promise<void>;
  saveAiSettings: (settings: AiSettings) => Promise<void>;
  saveSettings: () => Promise<void>;
  addAiConfig: (config: Omit<ApiConfig, "id">) => Promise<void>;
  updateAiConfig: (config: ApiConfig) => Promise<void>;
  deleteAiConfig: (configId: string) => Promise<void>;
  setActiveAiConfig: (configId: string | null) => Promise<void>;
  getActiveAiConfig: () => Promise<ApiConfig | null>;
  fetchModels: (config: ApiConfig) => Promise<void>;
  // Prompt Management
  createPromptCollection: (name: string) => Promise<void>;
  savePromptVersion: (name: string, content: string) => Promise<void>;
  updatePromptVersion: (name: string, timestamp: number, content: string) => Promise<void>;
  deletePromptVersion: (name: string, timestamp: number) => Promise<void>;
  updateSummaryPrompt: (content: string) => Promise<void>;
  resetAiSettings: () => Promise<void>;
}

// Define a more precise type for Zustand's set function if needed, or use the one from 'zustand/vanilla'
type ZustandSetFn<T> = StoreApi<T>["setState"];

export const useAiSettingsStore: UseBoundStore<StoreApi<AiSettingsState>> = create<AiSettingsState>(
  (set: ZustandSetFn<AiSettingsState>, get: () => AiSettingsState) => {
    // Helper function to ensure a default active config is set if needed
    const ensureDefaultActiveConfig = async (currentSettings: AiSettings | null) => {
      if (
        currentSettings &&
        !currentSettings.active_config_id &&
        currentSettings.api_configs &&
        currentSettings.api_configs.length > 0
      ) {
        const firstConfigId = currentSettings.api_configs[0].id;
        // Check if the store is still being created or if get() is available
        if (typeof get === "function" && get().setActiveAiConfig) {
          await get().setActiveAiConfig(firstConfigId);
        } else {
          // Fallback or warning if get().setActiveAiConfig is not available yet, though unlikely in this structure
          console.warn("ensureDefaultActiveConfig: setActiveAiConfig not available via get()");
        }
      }
    };

    return {
      aiSettings: null,
      isLoading: false,
      error: null,
      availableModels: [],
      loadingModels: false,

      fetchModels: async (config: ApiConfig) => {
        if (!config.base_url) {
          set({ error: "Base URL is not configured.", loadingModels: false, availableModels: [] });
          return;
        }
        set({ loadingModels: true, error: null });
        try {
          // Construct the models URL from the base_url
          const modelsUrl = `${config.base_url.replace(/\/$/, "")}/models`;
          const modelsResponse = await fetchAiModels(modelsUrl, config.api_key);
          // Check if the response itself is an array, otherwise look for a 'data' property.
          const models = Array.isArray(modelsResponse)
            ? modelsResponse
            : modelsResponse.models || modelsResponse.data || [];
          console.log(models);
          set({ availableModels: models, loadingModels: false });
        } catch (err) {
          console.error("Failed to fetch AI models:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          set({ error: `Failed to fetch models: ${errorMessage}`, loadingModels: false, availableModels: [] });
        }
      },

      loadAiSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          let settings = await load<AiSettings>(AI_SETTINGS_KEY);

          // If no settings are found in storage, create a default object.
          if (!settings) {
            settings = {
              api_configs: [],
              active_config_id: null,
              prompt_collections: null,
              summary_prompt: null,
              custom_prompts: null,
            };
          }

          set({ aiSettings: settings, isLoading: false });
          await ensureDefaultActiveConfig(settings);
        } catch (err) {
          console.error("Failed to load AI settings:", err);
          set({ error: String(err), isLoading: false });
        }
      },

      saveSettings: async () => {
        const { aiSettings, saveAiSettings } = get();
        if (aiSettings) {
          await saveAiSettings(aiSettings);
        }
      },

      saveAiSettings: async (settings: AiSettings) => {
        set({ isLoading: true, error: null });
        try {
          await save(AI_SETTINGS_KEY, settings);
          set({ aiSettings: settings, isLoading: false });
          loggingService.log("info", "AI settings saved successfully.", { settings });
        } catch (err) {
          console.error("Failed to save AI settings:", err);
          set({ error: String(err), isLoading: false });
        }
      },

      addAiConfig: async (config: Omit<ApiConfig, "id">) => {
        const currentSettings = get().aiSettings;
        const newConfig: ApiConfig = {
          ...config,
          id: crypto.randomUUID(),
          thinking: { enabled: false, budget_tokens: 4096 },
        };
        const updatedSettings: AiSettings = {
          active_config_id: currentSettings?.active_config_id || null,
          prompt_collections: currentSettings?.prompt_collections || null,
          summary_prompt: currentSettings?.summary_prompt || null,
          custom_prompts: currentSettings?.custom_prompts || null,
          ...currentSettings,
          api_configs: [...(currentSettings?.api_configs || []), newConfig],
        };
        set({ aiSettings: updatedSettings });
        await save(AI_SETTINGS_KEY, updatedSettings);
        await ensureDefaultActiveConfig(updatedSettings);
      },

      updateAiConfig: async (config: ApiConfig) => {
        const currentSettings = get().aiSettings;
        if (!currentSettings) return;

        const newApiConfigs = currentSettings.api_configs.map((c) => (c.id === config.id ? config : c));
        const updatedSettings = { ...currentSettings, api_configs: newApiConfigs };
        set({ aiSettings: updatedSettings });
        await save(AI_SETTINGS_KEY, updatedSettings);
      },

      deleteAiConfig: async (configId: string) => {
        const currentSettings = get().aiSettings;
        if (!currentSettings) return;

        const newApiConfigs = currentSettings.api_configs.filter((c) => c.id !== configId);
        let updatedSettings: AiSettings = { ...currentSettings, api_configs: newApiConfigs };

        // If the deleted config was the active one, reset it
        if (currentSettings.active_config_id === configId) {
          updatedSettings = { ...updatedSettings, active_config_id: null };
        }

        set({ aiSettings: updatedSettings });
        await save(AI_SETTINGS_KEY, updatedSettings);
        await ensureDefaultActiveConfig(updatedSettings);
      },

      setActiveAiConfig: async (configId: string | null) => {
        const currentSettings = get().aiSettings;
        if (!currentSettings) return;

        const updatedSettings = { ...currentSettings, active_config_id: configId };
        set({ aiSettings: updatedSettings });
        await save(AI_SETTINGS_KEY, updatedSettings);
      },

      getActiveAiConfig: async (): Promise<ApiConfig | null> => {
        const { aiSettings } = get();
        if (aiSettings && aiSettings.active_config_id && aiSettings.api_configs) {
          return aiSettings.api_configs.find((c: ApiConfig) => c.id === aiSettings.active_config_id) || null;
        }
        return null;
      },

      // --- Prompt Management ---
      createPromptCollection: async (name: string) => {
        const { aiSettings, saveAiSettings } = get();
        if (!aiSettings) return;

        const updatedSettings: AiSettings = {
          ...aiSettings,
          prompt_collections: {
            ...aiSettings.prompt_collections,
            [name]: {
              name: name,
              versions: [],
            },
          },
        };
        await saveAiSettings(updatedSettings);
      },

      savePromptVersion: async (name: string, content: string) => {
        const { aiSettings, saveAiSettings } = get();
        if (!aiSettings || !aiSettings.prompt_collections || !aiSettings.prompt_collections[name]) return;

        const parsedContent = parseLineFormat(content);
        if (!parsedContent) return; // Do not save if content is empty or invalid

        const newVersion = {
          timestamp: Date.now(),
          content: { text: "root", children: parsedContent },
        };

        const updatedSettings: AiSettings = {
          ...aiSettings,
          prompt_collections: {
            ...aiSettings.prompt_collections,
            [name]: {
              ...aiSettings.prompt_collections[name],
              versions: [...aiSettings.prompt_collections[name].versions, newVersion],
            },
          },
        };
        await saveAiSettings(updatedSettings);
      },

      updatePromptVersion: async (name: string, timestamp: number, content: string) => {
        const { aiSettings, saveAiSettings } = get();
        if (!aiSettings || !aiSettings.prompt_collections || !aiSettings.prompt_collections[name]) return;

        const parsedContent = parseLineFormat(content);
        if (!parsedContent) return; // Do not update if content is empty or invalid

        const updatedVersions = aiSettings.prompt_collections[name].versions.map((v) =>
          v.timestamp === timestamp ? { ...v, content: { text: "root", children: parsedContent } } : v,
        );

        const updatedSettings: AiSettings = {
          ...aiSettings,
          prompt_collections: {
            ...aiSettings.prompt_collections,
            [name]: {
              ...aiSettings.prompt_collections[name],
              versions: updatedVersions,
            },
          },
        };
        await saveAiSettings(updatedSettings);
      },

      deletePromptVersion: async (name: string, timestamp: number) => {
        const { aiSettings, saveAiSettings } = get();
        if (!aiSettings || !aiSettings.prompt_collections || !aiSettings.prompt_collections[name]) return;

        const updatedVersions = aiSettings.prompt_collections[name].versions.filter((v) => v.timestamp !== timestamp);

        const updatedSettings: AiSettings = {
          ...aiSettings,
          prompt_collections: {
            ...aiSettings.prompt_collections,
            [name]: {
              ...aiSettings.prompt_collections[name],
              versions: updatedVersions,
            },
          },
        };
        await saveAiSettings(updatedSettings);
      },

      updateSummaryPrompt: async (content: string) => {
        const { aiSettings, saveAiSettings } = get();
        if (!aiSettings) return;

        const updatedSettings: AiSettings = {
          ...aiSettings,
          summary_prompt: content,
        };
        await saveAiSettings(updatedSettings);
      },

      resetAiSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const defaultSettings: AiSettings = {
            api_configs: [],
            active_config_id: null,
            prompt_collections: null,
            summary_prompt: null,
            custom_prompts: null,
          };
          await save(AI_SETTINGS_KEY, defaultSettings);
          set({ aiSettings: defaultSettings, isLoading: false });
          loggingService.log("info", "AI settings have been reset.");
        } catch (err) {
          console.error("Failed to reset AI settings:", err);
          set({ error: String(err), isLoading: false });
        }
      },
    };
  },
);

// Selector to get the active ApiConfig directly from the store's state
export const selectActiveAiConfig = (state: AiSettingsState): ApiConfig | null => {
  const { aiSettings } = state;
  if (aiSettings && aiSettings.active_config_id && aiSettings.api_configs) {
    // Destructure after confirming aiSettings is not null
    const { api_configs, active_config_id } = aiSettings;
    return api_configs.find((c: ApiConfig) => c.id === active_config_id) || null;
  }
  return null;
};
