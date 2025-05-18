import { create, StoreApi, UseBoundStore } from "zustand";
import { invoke } from "@tauri-apps/api/tauri";
import type { AiSettings, ApiConfig } from "../types/aiSettings";

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
  fetchModelsForProvider: () => Promise<string[]>; // Placeholder
}

// Define a more precise type for Zustand's set function if needed, or use the one from 'zustand/vanilla'
type ZustandSetFn<T> = StoreApi<T>["setState"];

export const useAiSettingsStore: UseBoundStore<StoreApi<AiSettingsState>> = create<AiSettingsState>(
  (set: ZustandSetFn<AiSettingsState>, get: () => AiSettingsState) => ({
    aiSettings: null,
    isLoading: false,
    error: null,

    loadAiSettings: async () => {
      set({ isLoading: true, error: null });
      try {
        const settings = await invoke<AiSettings | null>("load_ai_settings");
        set({ aiSettings: settings, isLoading: false });
      } catch (err) {
        console.error("Failed to load AI settings:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    saveAiSettings: async (settings: AiSettings) => {
      set({ isLoading: true, error: null });
      try {
        await invoke("save_ai_settings", { settings });
        set({ aiSettings: settings, isLoading: false });
      } catch (err) {
        console.error("Failed to save AI settings:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    addAiConfig: async (config: Omit<ApiConfig, "id">) => {
      set({ isLoading: true, error: null });
      try {
        const newConfigWithPlaceholderId = { ...config, id: "" } as ApiConfig;
        const updatedSettings = await invoke<AiSettings>("add_ai_config", {
          config: newConfigWithPlaceholderId,
        });
        set({ aiSettings: updatedSettings, isLoading: false });
      } catch (err) {
        console.error("Failed to add AI config:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    updateAiConfig: async (config: ApiConfig) => {
      set({ isLoading: true, error: null });
      try {
        const updatedSettings = await invoke<AiSettings>("update_ai_config", { config });
        set({ aiSettings: updatedSettings, isLoading: false });
      } catch (err) {
        console.error("Failed to update AI config:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    deleteAiConfig: async (configId: string) => {
      set({ isLoading: true, error: null });
      try {
        const updatedSettings = await invoke<AiSettings>("delete_ai_config", { configId });
        set({ aiSettings: updatedSettings, isLoading: false });
      } catch (err) {
        console.error("Failed to delete AI config:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    setActiveAiConfig: async (configId: string | null) => {
      set({ isLoading: true, error: null });
      try {
        const updatedSettings = await invoke<AiSettings>("set_active_ai_config", { configId });
        set({ aiSettings: updatedSettings, isLoading: false });
      } catch (err) {
        console.error("Failed to set active AI config:", err);
        set({ error: String(err), isLoading: false });
      }
    },

    getActiveAiConfig: async (): Promise<ApiConfig | null> => {
      const { aiSettings } = get();
      if (aiSettings && aiSettings.active_config_id && aiSettings.api_configs) {
        return aiSettings.api_configs.find((c: ApiConfig) => c.id === aiSettings.active_config_id) || null;
      }
      return null;
    },

    fetchModelsForProvider: async (): Promise<string[]> => {
      set({ isLoading: true, error: null });
      try {
        const models = await invoke<string[]>("get_models_for_provider");
        set({ isLoading: false });
        return models;
      } catch (err) {
        console.error("Failed to fetch models for provider:", err);
        set({ error: String(err), isLoading: false });
        return [];
      }
    }, // Added trailing comma here
  }),
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
