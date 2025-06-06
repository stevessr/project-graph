import i18n from "i18next";
import { create, StoreApi, UseBoundStore } from "zustand";
import { invoke } from "../utils/tauriApi";
import type { AiSettings, ApiConfig } from "../types/aiSettings";

import { createStore } from "../utils/store";
import { v4 as uuidv4 } from "uuid";

const store = createStore("ai_settings.json");

interface AiSettingsState {
  aiSettings: AiSettings | null;
  isLoading: boolean;
  error: string | null;
  loadAiSettings: () => Promise<void>;
  saveAiSettings: (settings: AiSettings) => Promise<void>;
  addAiConfig: (config: Omit<ApiConfig, "id">) => Promise<void>;
  updateAiConfig: (config: ApiConfig) => Promise<void>;
  deleteAiConfig: (configId: string) => Promise<void>;
  setActiveAiConfig: (configId: string | null) => Promise<void>;
  getActiveAiConfig: () => Promise<ApiConfig | null>;
  resetAiSettings: () => Promise<void>;
  fetchModelsForProvider: () => Promise<string[]>; // Placeholder
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

      loadAiSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const s = await store;
          const settings = await s.get<AiSettings>("settings");
          let finalSettings = settings;
          if (!finalSettings) {
            finalSettings = {
              api_configs: [],
              active_config_id: "",
              prompt_collections: {},
              summary_prompt: "",
              custom_prompts: "",
            };
          }
          set({ aiSettings: finalSettings, isLoading: false });
          await ensureDefaultActiveConfig(finalSettings);
        } catch (err) {
          console.error(i18n.t("settings:failedToLoadSettings"), err);
          set({ error: i18n.t("settings:failedToLoadSettings"), isLoading: false });
        }
      },

      saveAiSettings: async (settings: AiSettings) => {
        set({ isLoading: true, error: null });
        try {
          const s = await store;
          await s.set("settings", settings);
          await s.save();
          set({ aiSettings: settings, isLoading: false });
        } catch (err) {
          console.error(i18n.t("settings:failedToSaveSettings"), err);
          set({ error: i18n.t("settings:failedToSaveSettings"), isLoading: false });
        }
      },

      addAiConfig: async (config: Omit<ApiConfig, "id">) => {
        set({ isLoading: true, error: null });
        try {
          const { aiSettings } = get();
          if (!aiSettings) {
            throw new Error(i18n.t("settings:aiSettingsNotLoaded"));
          }

          const newConfigId = uuidv4(); // Generate a unique ID
          const newConfig: ApiConfig = { ...config, id: newConfigId };

          const newSettings = {
            ...aiSettings,
            api_configs: [...aiSettings.api_configs, newConfig],
          };

          const s = await store;
          await s.set("settings", newSettings);
          await s.save();

          set({ aiSettings: newSettings, isLoading: false });
          await ensureDefaultActiveConfig(newSettings);
        } catch (err) {
          console.error(i18n.t("settings:failedToAddConfig"), err);
          set({ error: i18n.t("settings:failedToAddConfig"), isLoading: false });
        }
      },

      updateAiConfig: async (config: ApiConfig) => {
        set({ isLoading: true, error: null });
        try {
          const { aiSettings } = get();
          if (!aiSettings) {
            throw new Error(i18n.t("settings:aiSettingsNotLoaded"));
          }

          const configIndex = aiSettings.api_configs.findIndex((c) => c.id === config.id);
          if (configIndex === -1) {
            throw new Error(i18n.t("settings:apiConfigNotFound", { id: config.id }));
          }

          const newApiConfigs = [...aiSettings.api_configs];
          newApiConfigs[configIndex] = config;

          const newSettings = {
            ...aiSettings,
            api_configs: newApiConfigs,
          };

          const s = await store;
          await s.set("settings", newSettings);
          await s.save();

          set({ aiSettings: newSettings, isLoading: false });
        } catch (err) {
          console.error(i18n.t("settings:failedToUpdateConfig"), err);
          set({ error: i18n.t("settings:failedToUpdateConfig"), isLoading: false });
        }
      },

      deleteAiConfig: async (configId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { aiSettings } = get();
          if (!aiSettings) {
            throw new Error(i18n.t("settings:aiSettingsNotLoaded"));
          }

          const newApiConfigs = aiSettings.api_configs.filter((c) => c.id !== configId);

          const newSettings = {
            ...aiSettings,
            api_configs: newApiConfigs,
            active_config_id: aiSettings.active_config_id === configId ? null : aiSettings.active_config_id,
          };

          const s = await store;
          await s.set("settings", newSettings);
          await s.save();

          set({ aiSettings: newSettings, isLoading: false });
          await ensureDefaultActiveConfig(newSettings);
        } catch (err) {
          console.error(i18n.t("settings:failedToDeleteConfig"), err);
          set({ error: i18n.t("settings:failedToDeleteConfig"), isLoading: false });
        }
      },

      setActiveAiConfig: async (configId: string | null) => {
        set({ isLoading: true, error: null });
        try {
          const { aiSettings } = get();
          if (!aiSettings) {
            throw new Error(i18n.t("settings:aiSettingsNotLoaded"));
          }

          // Validate if configId exists in api_configs if not null
          if (configId !== null) {
            const configExists = aiSettings.api_configs.some((c) => c.id === configId);
            if (!configExists) {
              console.warn(i18n.t("settings:configNotFoundWarning", { id: configId }));
              configId = null; // Set to null if ID doesn't exist
            }
          }

          const newSettings = {
            ...aiSettings,
            active_config_id: configId,
          };

          const s = await store;
          await s.set("settings", newSettings);
          await s.save();

          set({ aiSettings: newSettings, isLoading: false });
        } catch (err) {
          console.error(i18n.t("settings:failedToSetActiveConfig"), err);
          set({ error: i18n.t("settings:failedToSetActiveConfig"), isLoading: false });
        }
      },

      getActiveAiConfig: async (): Promise<ApiConfig | null> => {
        const { aiSettings } = get();
        if (aiSettings && aiSettings.active_config_id && aiSettings.api_configs) {
          return aiSettings.api_configs.find((c: ApiConfig) => c.id === aiSettings.active_config_id) || null;
        }
        return null;
      },

      resetAiSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const s = await store;
          const defaultSettings: AiSettings = {
            api_configs: [],
            active_config_id: "",
            prompt_collections: {},
            summary_prompt: "",
            custom_prompts: "",
          };
          await s.set("settings", defaultSettings);
          await s.save();
          set({ aiSettings: defaultSettings, isLoading: false });
        } catch (err) {
          console.error(i18n.t("settings:failedToResetSettings"), err);
          set({ error: i18n.t("settings:failedToResetSettings"), isLoading: false });
        }
      },

      fetchModelsForProvider: async (): Promise<string[]> => {
        set({ isLoading: true, error: null });
        try {
          const models = await invoke<string[]>("get_models_for_provider");
          set({ isLoading: false });
          return models;
        } catch (err) {
          console.error(i18n.t("settings:failedToFetchModels"), err);
          set({ error: i18n.t("settings:failedToFetchModels"), isLoading: false });
          return [];
        }
      }, // Added trailing comma here
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
