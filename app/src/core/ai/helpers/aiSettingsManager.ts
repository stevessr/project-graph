// src/core/ai/helpers/aiSettingsManager.ts
import { useAiSettingsStore } from "../../../state/aiSettingsStore";
import { GetActiveConfigResult } from "./types";

export async function getActiveAiConfiguration(): Promise<GetActiveConfigResult> {
  try {
    let aiSettings = useAiSettingsStore.getState().aiSettings;

    // If settings are not in memory, try loading them.
    if (!aiSettings) {
      await useAiSettingsStore.getState().loadAiSettings();
      aiSettings = useAiSettingsStore.getState().aiSettings;
    }

    if (!aiSettings) {
      return { error: "AI settings could not be loaded." };
    }

    const activeConfig = aiSettings.api_configs.find((config) => config.id === aiSettings.active_config_id);

    if (!activeConfig) {
      if (aiSettings.api_configs && aiSettings.api_configs.length > 0) {
        return { error: "No active API configuration is set. Please select one in the settings." };
      }
      return { error: "No API configurations found. Please add one in the settings." };
    }

    return { config: activeConfig, settings: aiSettings };
  } catch (e: any) {
    console.error("Error accessing AI settings from store:", e);
    return { error: `Error accessing AI settings: ${e.message || "Unknown error"}` };
  }
}
