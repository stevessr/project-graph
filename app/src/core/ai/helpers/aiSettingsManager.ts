// src/core/ai/helpers/aiSettingsManager.ts
import { invoke } from "../../../utils/tauriApi";
import { AiSettings } from "../../../types/aiSettings";
import { GetActiveConfigResult } from "./types";

export async function getActiveAiConfiguration(): Promise<GetActiveConfigResult> {
  try {
    const aiSettings: AiSettings = await invoke("load_ai_settings");
    const activeConfig = aiSettings.api_configs.find((config) => config.id === aiSettings.active_config_id);

    if (!activeConfig) {
      return { error: "No active API configuration found." };
    }
    // No need to cast to ActiveAiConfig if AiApiConfig is sufficient
    return { config: activeConfig, settings: aiSettings };
  } catch (e: any) {
    console.error("Error loading AI settings:", e);
    return { error: `Error loading AI settings: ${e.message || "Unknown error"}` };
  }
}
