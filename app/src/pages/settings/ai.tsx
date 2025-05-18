// src/pages/settings/ai.tsx
import { AiSettings, ApiConfig } from "../../types/aiSettings";
import { invoke } from "../../utils/tauriApi";
import Button from "../../components/Button";
import { Save, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog } from "../../components/dialog";

import { ApiConfigSection } from "./ai/ApiConfigSection";
import { PromptManagementSection } from "./ai/PromptManagementSection";
import { useAiSettingsManager } from "./ai/useAiSettingsManager";
import { usePromptManager } from "./ai/usePromptManager";

export default function AI() {
  const { t } = useTranslation("settings");

  const {
    settings,
    // setSettings, // Not directly used here, loadSettings re-fetches
    activeApiConfig,
    // setActiveApiConfig, // Managed by useAiSettingsManager or handleSaveSettings
    availableModels,
    loadingModels,
    error,
    // setError, // Managed by useAiSettingsManager
    loadSettings: refreshSettings, // Renamed for clarity
    fetchModels,
    handleApiConfigChange,
    confirmAndResetAISettings,
  } = useAiSettingsManager(t);

  const {
    customPromptsString,
    setCustomPromptsString,
    selectedPromptName,
    // setSelectedPromptName, // Managed by usePromptManager
    selectedVersionTimestamp,
    // setSelectedVersionTimestamp, // Managed by usePromptManager
    newPromptName,
    setNewPromptName,
    currentSummaryPrompt,
    handleSummaryPromptChange,
    handlePromptSelect,
    handleVersionSelect,
    handleSavePromptVersion,
    handleUpdateCurrentPromptVersion,
    handleCreateNewPrompt,
    handleDeleteSelectedVersion,
  } = usePromptManager(settings, refreshSettings, t);

  const handleSaveSettings = async () => {
    try {
      const apiConfigsToSend: ApiConfig[] = [...(settings.api_configs || [])];
      let activeConfigIdToSend: string | null = settings.active_config_id;

      if (activeApiConfig) {
        const existingConfigIndex = apiConfigsToSend.findIndex((c) => c.id === activeApiConfig.id);
        if (existingConfigIndex > -1) {
          apiConfigsToSend[existingConfigIndex] = activeApiConfig;
        } else {
          apiConfigsToSend.push(activeApiConfig);
        }
        activeConfigIdToSend = activeApiConfig.id;
      }

      // Construct the settings payload for the backend
      // Ensure prompt_collections is preserved from the main 'settings' state
      // while custom_prompts and summary_prompt come from the prompt manager's current state.
      const settingsToSaveBackend: AiSettings = {
        ...settings, // Base settings including prompt_collections
        api_configs: apiConfigsToSend,
        active_config_id: activeConfigIdToSend,
        // Use the current state of customPromptsString from usePromptManager.
        // This is important if the user has edited it but not saved a version yet,
        // and they want to save it as the "legacy" custom_prompts.
        // Or, if no collection is selected, this string is what they're editing.
        custom_prompts: customPromptsString === "" ? null : customPromptsString,
        // Use the current state of summary_prompt from usePromptManager
        summary_prompt: currentSummaryPrompt,
      };

      console.log("Saving settings to backend:", settingsToSaveBackend);
      await invoke("save_ai_settings", { settings: settingsToSaveBackend });
      await Dialog.show({ title: t("ai.saveSuccess") });

      await refreshSettings(); // Reload all settings to ensure UI consistency
      // The useEffects in usePromptManager will handle re-syncing prompt displays
    } catch (err) {
      console.error(t("ai.saveFailure"), err);
      await Dialog.show({ title: `${t("ai.saveFailure")} ${err}` });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-panel-text text-2xl font-bold">{t("ai.title")}</h1>
      {error && <div className="text-red-500">{error}</div>}

      <ApiConfigSection
        activeApiConfig={activeApiConfig}
        availableModels={availableModels}
        loadingModels={loadingModels}
        onInputChange={handleApiConfigChange}
        onFetchModels={fetchModels} // Pass fetchModels if manual trigger is needed in section
        t={t}
      />

      <PromptManagementSection
        // Pass settings from useAiSettingsManager for displaying collections/versions
        settings={settings}
        customPromptsString={customPromptsString}
        selectedPromptName={selectedPromptName}
        selectedVersionTimestamp={selectedVersionTimestamp}
        newPromptName={newPromptName}
        onCustomPromptsStringChange={setCustomPromptsString}
        onNewPromptNameChange={setNewPromptName}
        onPromptSelect={handlePromptSelect}
        onVersionSelect={handleVersionSelect}
        onCreateNewPrompt={handleCreateNewPrompt}
        onSavePromptVersion={handleSavePromptVersion}
        onUpdateCurrentPromptVersion={handleUpdateCurrentPromptVersion}
        onDeleteSelectedVersion={handleDeleteSelectedVersion}
        summaryPrompt={currentSummaryPrompt} // Pass currentSummaryPrompt from usePromptManager
        onSummaryPromptChange={handleSummaryPromptChange}
        t={t}
      />

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSaveSettings}
          className="focus::ring-indigo-500 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <Save size={16} className="mr-2" />
          {t("ai.save")}
        </Button>
        <Button
          onClick={confirmAndResetAISettings}
          className="focus::ring-red-500 inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <RotateCcw size={16} className="mr-2" />
          {t("ai.reset")}
        </Button>
      </div>
    </div>
  );
}
