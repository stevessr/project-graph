// src/pages/settings/ai/useAiSettingsManager.ts
import { useState, useEffect, useCallback } from "react";
import { AiSettings } from "../../../types/aiSettings"; // ApiConfig removed as it's not directly used here
import { invoke, fetch as tauriFetch } from "../../../utils/tauriApi";
import { Dialog } from "../../../components/dialog";
import { TFunction } from "i18next";
import { useAiSettingsStore, selectActiveAiConfig } from "../../../state/aiSettingsStore"; // Import the store and selector

const initialSettings: AiSettings = {
  api_configs: [],
  active_config_id: "", // Changed from null to empty string
  prompt_collections: {},
  summary_prompt: null,
  custom_prompts: null,
};

export function useAiSettingsManager(t: TFunction<"settings", undefined>) {
  // Use state from Zustand store
  const storeSettings = useAiSettingsStore((state) => state.aiSettings);
  const storeActiveApiConfig = useAiSettingsStore(selectActiveAiConfig);
  const {
    loadAiSettings: storeLoadAiSettings,
    addAiConfig: storeAddAiConfig,
    updateAiConfig: storeUpdateAiConfig,
    deleteAiConfig: storeDeleteAiConfig,
    setActiveAiConfig: storeSetActiveAiConfig,
    saveAiSettings: storeSaveAiSettings, // Assuming saveAiSettings is also needed by parent
    // fetchModelsForProvider: storeFetchModelsForProvider, // Removed as it's not used
  } = useAiSettingsStore();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  // Error state can be derived from store or kept local if specific to this hook's operations
  const storeError = useAiSettingsStore((state) => state.error);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  // Effect to load settings on mount using store action
  useEffect(() => {
    storeLoadAiSettings();
  }, [storeLoadAiSettings]);

  const updateActiveModel = useCallback(
    async (modelId: string) => {
      if (storeActiveApiConfig) {
        const updatedConfig = { ...storeActiveApiConfig, model: modelId };
        await storeUpdateAiConfig(updatedConfig);
        // Optionally, re-fetch models if changing model might affect available models,
        // though typically it shouldn't for the same provider/base_url.
        // await fetchModels();
      }
    },
    [storeActiveApiConfig, storeUpdateAiConfig],
  );

  // Function to fetch available models for the active API config
  // This now uses the store's active config directly
  const fetchModels = useCallback(async () => {
    if (!storeActiveApiConfig || !storeActiveApiConfig.base_url) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    setFetchModelsError(null);
    try {
      // This logic is specific to fetching models based on provider type,
      // which might be better suited inside the store or a dedicated service.
      // For now, keeping it here but using storeActiveApiConfig.
      const modelsUrl = `${storeActiveApiConfig.base_url}/models`;
      const headers: Record<string, string> = {};
      if (storeActiveApiConfig.api_key && storeActiveApiConfig.provider !== "ollama") {
        headers["Authorization"] = `Bearer ${storeActiveApiConfig.api_key}`;
      }
      const response = await tauriFetch(modelsUrl, { method: "GET", headers });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}. Body: ${errorBody}`);
      }
      const modelsData: any = await response.json();

      if (modelsData && modelsData.data && Array.isArray(modelsData.data)) {
        setAvailableModels(
          modelsData.data
            .map((m: any) => m.id)
            .filter(Boolean)
            .map(String),
        );
      } else if (modelsData && modelsData.models && Array.isArray(modelsData.models)) {
        setAvailableModels(
          modelsData.models
            .map((m: any) => m.name)
            .filter(Boolean)
            .map(String),
        );
      } else if (Array.isArray(modelsData)) {
        setAvailableModels(modelsData.filter(Boolean).map(String));
      } else {
        console.warn(t("ai.parseFailure"), modelsData);
        setAvailableModels([]);
      }
    } catch (err) {
      console.error(t("ai.fetchFailure"), err);
      setFetchModelsError(`${t("ai.fetchFailure")} ${err instanceof Error ? err.message : String(err)}`);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [storeActiveApiConfig, t]);

  // Effect to fetch models when storeActiveApiConfig changes
  useEffect(() => {
    if (storeActiveApiConfig && storeActiveApiConfig.base_url) {
      fetchModels();
    } else {
      setAvailableModels([]);
    }
  }, [
    storeActiveApiConfig?.id,
    storeActiveApiConfig?.base_url,
    storeActiveApiConfig?.api_key,
    storeActiveApiConfig?.provider,
    fetchModels,
  ]);

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
        await storeLoadAiSettings(); // Reload settings using store action
        await Dialog.show({ title: t("ai.resetSuccess", "AI Settings Reset"), type: "success" });
      }
    } catch (err) {
      console.error(t("ai.dialogError", "Dialog Error"), err);
      await Dialog.show({ title: t("ai.dialogError", "Dialog Error"), content: String(err), type: "error" });
    }
  };

  // The hook now returns state derived from the store and store actions
  return {
    settings: storeSettings || initialSettings, // Provide a default if storeSettings is null
    activeApiConfig: storeActiveApiConfig, // This is reactive from the store
    availableModels,
    loadingModels,
    error: storeError || fetchModelsError, // Combine errors or prioritize
    setError: setFetchModelsError, // Allow parent to clear fetchModelsError if needed
    loadSettings: storeLoadAiSettings,
    fetchModels,
    switchActiveApiConfig: storeSetActiveAiConfig,
    addApiConfig: storeAddAiConfig,
    updateApiConfig: storeUpdateAiConfig,
    deleteApiConfig: storeDeleteAiConfig,
    confirmAndResetAISettings,
    updateActiveModel, // Expose the new function
    // Expose store's save function if parent needs it for other parts (e.g. prompt saving)
    saveAiSettings: storeSaveAiSettings,
    // Expose the original store action for setting active config if needed elsewhere directly
    setStoreActiveConfig: storeSetActiveAiConfig,
  };
}
