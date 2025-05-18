// src/pages/settings/ai/useAiSettingsManager.ts
import { useState, useEffect, useCallback } from "react";
import { AiSettings, ApiConfig } from "../../../types/aiSettings";
import { invoke, fetch as tauriFetch } from "../../../utils/tauriApi";
import { Dialog } from "../../../components/dialog";
import { TFunction } from "i18next";
import { useAiSettingsStore } from "../../../state/aiSettingsStore"; // Import the store

export function useAiSettingsManager(t: TFunction<"settings", undefined>) {
  const [settings, setSettings] = useState<AiSettings>({
    api_configs: [],
    active_config_id: "",
    prompt_collections: {}, // Ensure it's an object, not null
    summary_prompt: null,
    custom_prompts: null,
  });
  const [activeApiConfig, setActiveApiConfig] = useState<ApiConfig>() || ({} as ApiConfig); // Initialize to an empty object
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the setActiveAiConfig action from the store
  const { setActiveAiConfig: setStoreActiveConfig } = useAiSettingsStore();

  // Function to load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      const loadedSettingsFromBackend: AiSettings = await invoke("load_ai_settings");
      console.log("Loaded settings from backend:", loadedSettingsFromBackend);

      const normalizedConfigs = (loadedSettingsFromBackend.api_configs || []).map((config) => ({
        ...config,
        provider: config.provider || "openai", // Ensure provider default
      }));

      const finalSettings = {
        ...loadedSettingsFromBackend,
        api_configs: normalizedConfigs,
        prompt_collections: loadedSettingsFromBackend.prompt_collections || {},
      };
      setSettings(finalSettings);
      return finalSettings; // Return the processed settings
    } catch (err) {
      console.error(t("ai.loadFailure"), err);
      setError(`${t("ai.loadFailure")} ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [t]);

  // Effect to load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Effect to derive activeApiConfig from settings
  useEffect(() => {
    let currentActiveConfig: ApiConfig = {} as ApiConfig; // Initialize to an empty object
    if (settings.active_config_id && settings.api_configs.length > 0) {
      currentActiveConfig = settings.api_configs.find((c) => c.id === settings.active_config_id) || ({} as ApiConfig);
    }
    // If no active_config_id or it's invalid, and configs exist, default to the first one
    if (!currentActiveConfig && settings.api_configs.length > 0) {
      currentActiveConfig = settings.api_configs[0];
      // Optionally, if you want to persist this implicit switch immediately:
      // setSettings(prev => ({ ...prev, active_config_id: currentActiveConfig?.id || null }));
    }
    // Only update if the derived active config is different from the current one
    if (
      activeApiConfig?.id !== currentActiveConfig?.id ||
      JSON.stringify(activeApiConfig) !== JSON.stringify(currentActiveConfig)
    ) {
      // Deep compare for content changes
      setActiveApiConfig(currentActiveConfig);
      console.log("Derived and set activeApiConfig:", currentActiveConfig);
    }
  }, [settings.api_configs, settings.active_config_id, activeApiConfig]); // Added activeApiConfig to dependency array

  // Function to fetch available models for the active API config
  const fetchModels = useCallback(async () => {
    if (!activeApiConfig || !activeApiConfig.base_url) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    setError(null);
    try {
      const modelsUrl = `${activeApiConfig.base_url}/models`;
      const headers: Record<string, string> = {};
      if (activeApiConfig.api_key && activeApiConfig.provider !== "ollama") {
        // Ollama might not need/use Bearer token
        headers["Authorization"] = `Bearer ${activeApiConfig.api_key}`;
      }
      const response = await tauriFetch(modelsUrl, { method: "GET", headers }); // Explicitly GET
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}. Body: ${errorBody}`);
      }
      const modelsData: any = await response.json();

      if (modelsData && modelsData.data && Array.isArray(modelsData.data)) {
        // OpenAI like structure
        setAvailableModels(
          modelsData.data
            .map((m: any) => m.id)
            .filter(Boolean)
            .map(String),
        );
      } else if (modelsData && modelsData.models && Array.isArray(modelsData.models)) {
        // Ollama like structure
        setAvailableModels(
          modelsData.models
            .map((m: any) => m.name)
            .filter(Boolean)
            .map(String),
        );
      } else if (Array.isArray(modelsData)) {
        // Simple array of strings
        setAvailableModels(modelsData.filter(Boolean).map(String));
      } else {
        console.warn(t("ai.parseFailure"), modelsData);
        // setError(t("ai.parseFailure"));
        setAvailableModels([]); // Keep empty or try to extract if structure is known but different
      }
    } catch (err) {
      console.error(t("ai.fetchFailure"), err);
      setError(`${t("ai.fetchFailure")} ${err instanceof Error ? err.message : String(err)}`);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [activeApiConfig, t]);

  // Effect to fetch models when activeApiConfig changes
  useEffect(() => {
    if (activeApiConfig && activeApiConfig.base_url) {
      // Ensure base_url is present
      fetchModels();
    } else {
      setAvailableModels([]); // Clear models if no active config or no base_url
    }
  }, [activeApiConfig?.id, activeApiConfig?.base_url, activeApiConfig?.api_key, fetchModels]); // Re-fetch if relevant parts of active config change

  // Function to switch the active API configuration
  const switchActiveApiConfig = useCallback(
    async (configId: string | null) => {
      // Use the store action to update and persist the active config
      await setStoreActiveConfig(configId);
      // The effect listening to settings.active_config_id will update local state
    },
    [setStoreActiveConfig],
  );

  // Function to add a new API configuration
  const addApiConfig = useCallback((newConfig: ApiConfig) => {
    setSettings((prev) => {
      const updatedConfigs = [...prev.api_configs, newConfig];
      // Optionally, make the newly added config active
      // const newActiveId = newConfig.id;
      return {
        ...prev,
        api_configs: updatedConfigs,
        // active_config_id: newActiveId, // Uncomment to make new config active
      };
    });
  }, []);

  // Function to update an existing API configuration
  const updateApiConfig = useCallback((updatedConfig: ApiConfig) => {
    setSettings((prev) => {
      const configExists = prev.api_configs.some((c) => c.id === updatedConfig.id);
      if (!configExists) {
        console.warn("Attempted to update a non-existent API config. Adding it instead.", updatedConfig);
        return {
          ...prev,
          api_configs: [...prev.api_configs, updatedConfig],
          active_config_id: prev.active_config_id === null ? updatedConfig.id : prev.active_config_id, // Optionally activate if no active
        };
      }
      const updatedConfigs = prev.api_configs.map((c) => (c.id === updatedConfig.id ? updatedConfig : c));
      return { ...prev, api_configs: updatedConfigs };
    });
  }, []);

  // Function to delete an API configuration
  const deleteApiConfig = useCallback((configId: string) => {
    setSettings((prev) => {
      const updatedConfigs = prev.api_configs.filter((c) => c.id !== configId);
      let newActiveId = prev.active_config_id;
      if (prev.active_config_id === configId) {
        // If the deleted config was active
        newActiveId = updatedConfigs.length > 0 ? updatedConfigs[0].id : ""; // Make first one active, or null
      }
      return { ...prev, api_configs: updatedConfigs, active_config_id: newActiveId };
    });
  }, []);

  // Function to reset all AI settings to default
  const confirmAndResetAISettings = async () => {
    try {
      const confirmation = await Dialog.show({
        title: t("ai.resetConfirmTitle", "Reset AI Settings?"),
        content: t(
          "ai.resetConfirmMessage",
          "Are you sure you want to reset all AI settings to their defaults? This action cannot be undone.",
        ),
        type: "warning",
        buttons: [
          { text: t("common.cancel", "Cancel"), color: "white" },
          { text: t("ai.resetConfirmButton", "Confirm Reset"), color: "red" },
        ],
      });
      if (confirmation.button === t("ai.resetConfirmButton", "Confirm Reset")) {
        await invoke("reset_ai_settings");
        await loadSettings(); // Reload settings after reset
        await Dialog.show({ title: t("ai.resetSuccess", "AI Settings Reset"), type: "success" });
      }
    } catch (err) {
      // Changed error to err to match usage
      console.error(t("ai.dialogError", "Dialog Error"), err);
      await Dialog.show({ title: t("ai.dialogError", "Dialog Error"), content: String(err), type: "error" });
    }
  };

  return {
    settings,
    setSettings, // Keep for prompt manager and direct save if needed
    activeApiConfig,
    availableModels,
    loadingModels,
    error,
    setError,
    loadSettings, // For explicit refresh
    fetchModels, // Added fetchModels to the returned object
    // New CRUD functions for API configs
    switchActiveApiConfig,
    addApiConfig,
    updateApiConfig,
    deleteApiConfig,
    confirmAndResetAISettings,
    setStoreActiveConfig, // Exported the store action
  };
}
