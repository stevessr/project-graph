// src/core/ai/helpers/aiSettingsManager.ts
import { useAiSettingsStore } from "../../../state/aiSettingsStore";
import { GetActiveConfigResult } from "./types";
import { ApiConfig } from "../../../types/aiSettings";
import { useTranslation } from "react-i18next";

export function getActiveAiConfiguration(): GetActiveConfigResult {
  const { t } = useTranslation("settings");
  try {
    const state = useAiSettingsStore.getState();
    const aiSettings = state.aiSettings;

    if (!aiSettings) {
      // Handle case where settings are not loaded yet
      return { error: t("ai.errors.settingsNotLoaded") };
    }

    const activeConfig = aiSettings.api_configs.find((config: ApiConfig) => config.id === aiSettings.active_config_id);

    if (!activeConfig) {
      return { error: t("ai.errors.noActiveConfig") };
    }

    return { config: activeConfig, settings: aiSettings };
  } catch (e: any) {
    console.error(t("ai.errors.getActiveSettingsError"), e);
    return { error: `${t("ai.errors.getActiveSettingsError")}: ${e.message || t("ai.errors.unknownError")}` };
  }
}
