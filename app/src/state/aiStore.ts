import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createStore as createTauriStore } from "../utils/store";
import type { AiSettings, ApiConfig, PromptCollection, PromptNode, PromptVersion } from "../types/aiSettings";
import { fetch } from "../utils/tauriApi";

// --- State ---
interface AiState {
  settings: AiSettings;
  availableModels: string[];
  loadingModels: boolean;
  error: string | null;
  selectedPromptName: string | null;
  selectedVersionTimestamp: number | null;
  newPromptName: string;
}

// --- Actions ---
interface AiActions {
  // API Config Actions
  addApiConfig: (newConfig: Omit<ApiConfig, "id">) => void;
  editApiConfig: (updatedConfig: ApiConfig) => void;
  deleteApiConfig: (configId: string) => void;
  setActiveApiConfig: (configId: string | null) => void;
  getActiveApiConfig: () => ApiConfig | undefined;
  fetchModels: () => Promise<void>;
  updateApiConfig: (updatedConfig: ApiConfig) => void;
  switchActiveApiConfig: (configId: string | null) => void;
  confirmAndResetAISettings: () => void;
  updateActiveModel: (model: string) => void;

  // Prompt Versioning Actions
  savePromptVersion: (promptName: string, content: PromptNode) => void;
  updatePromptVersion: (promptName: string, timestamp: number, content: PromptNode) => void;
  deletePromptVersion: (promptName: string, timestamp: number) => void;
  getPromptCollection: (promptName: string) => PromptCollection | undefined;
  getLatestPromptVersion: (promptName: string) => PromptVersion | undefined;

  // Simple State Setters
  setCustomPromptsString: (prompts: string) => void;
  setNewPromptName: (name: string) => void;
  setSelectedPromptName: (name: string | null) => void;
  setSelectedVersionTimestamp: (timestamp: number | null) => void;
  setSummaryPrompt: (prompt: string) => void;
}

// Custom storage for Tauri's async store, compatible with Zustand's persist middleware.
const tauriStore = createTauriStore("ai-settings");

const storage = {
  getItem: async (name: string): Promise<string | null> => {
    const store = await tauriStore;
    const value = await store.get<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const store = await tauriStore;
    await store.set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    const store = await tauriStore;
    await store.delete(name);
  },
};

// --- Store ---
export const useAiStore = create<AiState & AiActions>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      settings: {
        api_configs: [],
        active_config_id: null,
        prompt_collections: {},
        summary_prompt: null,
        custom_prompts: null,
      },
      availableModels: [],
      loadingModels: false,
      error: null,
      selectedPromptName: null,
      selectedVersionTimestamp: null,
      newPromptName: "",

      // --- API Config Actions ---
      fetchModels: async () => {
        const activeConfig = get().getActiveApiConfig();
        if (!activeConfig || !activeConfig.base_url) {
          set({ error: "Active API configuration or base URL is not set.", loadingModels: false });
          return;
        }

        set({ loadingModels: true, error: null });

        try {
          // Construct the URL for the models endpoint
          const url = new URL(activeConfig.base_url);
          if (!url.pathname.endsWith("/")) {
            url.pathname += "/";
          }
          url.pathname += "models";

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${activeConfig.api_key}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
          }

          const data = await response.json();
          const models = data.data.map((model: any) => model.id);
          set({ availableModels: models, loadingModels: false });
        } catch (e: any) {
          set({ error: e.message || "An unknown error occurred.", loadingModels: false });
        }
      },

      updateApiConfig: (updatedConfig) => {
        get().editApiConfig(updatedConfig);
      },

      switchActiveApiConfig: (configId: string | null) => {
        get().setActiveApiConfig(configId);
      },

      confirmAndResetAISettings: () => {
        set({
          settings: {
            api_configs: [],
            active_config_id: null,
            prompt_collections: {},
            summary_prompt: null,
            custom_prompts: null,
          },
        });
      },

      updateActiveModel: (model) => {
        const activeConfig = get().getActiveApiConfig();
        if (activeConfig) {
          get().editApiConfig({ ...activeConfig, model });
        }
      },

      addApiConfig: (newConfig) => {
        const id = crypto.randomUUID();
        const configWithId = { ...newConfig, id };
        set((state) => {
          const newApiConfigs = [...state.settings.api_configs, configWithId];
          // If this is the first config being added, make it active.
          const newActiveConfigId = state.settings.active_config_id ?? id;

          return {
            settings: {
              ...state.settings,
              api_configs: newApiConfigs,
              active_config_id: newActiveConfigId,
            },
          };
        });
      },

      editApiConfig: (updatedConfig) => {
        set((state) => ({
          settings: {
            ...state.settings,
            api_configs: state.settings.api_configs.map((config) =>
              config.id === updatedConfig.id ? updatedConfig : config,
            ),
          },
        }));
      },

      deleteApiConfig: (configId) => {
        set((state) => ({
          settings: {
            ...state.settings,
            api_configs: state.settings.api_configs.filter((config) => config.id !== configId),
            active_config_id: state.settings.active_config_id === configId ? null : state.settings.active_config_id,
          },
        }));
      },

      setActiveApiConfig: (configId: string | null) => {
        set((state) => ({
          settings: { ...state.settings, active_config_id: configId },
        }));
      },

      getActiveApiConfig: () => {
        const { settings } = get();
        if (!settings.active_config_id) return undefined;
        return settings.api_configs.find((config) => config.id === settings.active_config_id);
      },

      // --- Simple State Setters ---
      setCustomPromptsString: (prompts) => {
        set((state) => ({ settings: { ...state.settings, custom_prompts: prompts } }));
      },
      setNewPromptName: (name) => {
        set({ newPromptName: name });
      },
      setSelectedPromptName: (name) => {
        set({ selectedPromptName: name });
      },
      setSelectedVersionTimestamp: (timestamp) => {
        set({ selectedVersionTimestamp: timestamp });
      },
      setSummaryPrompt: (prompt) => {
        set((state) => ({ settings: { ...state.settings, summary_prompt: prompt } }));
      },

      // --- Prompt Versioning Actions ---
      savePromptVersion: (promptName, content) => {
        set((state) => {
          const collections = { ...(state.settings.prompt_collections || {}) };
          const collection = collections[promptName] || {
            name: promptName,
            versions: [],
          };
          const newVersion: PromptVersion = {
            content,
            timestamp: Date.now(),
          };
          collection.versions.push(newVersion);
          collections[promptName] = collection;
          return {
            settings: { ...state.settings, prompt_collections: collections },
          };
        });
      },

      updatePromptVersion: (promptName, timestamp, content) => {
        set((state) => {
          const collections = { ...(state.settings.prompt_collections || {}) };
          const collection = collections[promptName];
          if (collection) {
            collection.versions = collection.versions.map((version) =>
              version.timestamp === timestamp ? { ...version, content } : version,
            );
            collections[promptName] = collection;
          }
          return {
            settings: { ...state.settings, prompt_collections: collections },
          };
        });
      },

      deletePromptVersion: (promptName, timestamp) => {
        set((state) => {
          const collections = { ...(state.settings.prompt_collections || {}) };
          const collection = collections[promptName];
          if (collection) {
            collection.versions = collection.versions.filter((version) => version.timestamp !== timestamp);
            collections[promptName] = collection;
          }
          return {
            settings: { ...state.settings, prompt_collections: collections },
          };
        });
      },

      getPromptCollection: (promptName) => {
        return get().settings.prompt_collections?.[promptName];
      },

      getLatestPromptVersion: (promptName) => {
        const collection = get().settings.prompt_collections?.[promptName];
        if (!collection || collection.versions.length === 0) {
          return undefined;
        }
        return [...collection.versions].sort((a, b) => b.timestamp - a.timestamp)[0];
      },
    }),
    {
      name: "settings", // The key under which the state is stored in the Tauri store.
      storage: createJSONStorage(() => storage),
      // Only persist the 'settings' part of the state
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
