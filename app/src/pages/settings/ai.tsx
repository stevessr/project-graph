// src/pages/settings/ai.tsx
import { useState } from "react";
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
import ApiConfigForm from "./ai/ApiConfigForm"; // Import the form

export default function AI() {
  const { t } = useTranslation("settings");

  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<ApiConfig | null>(null);

  const {
    settings,
    activeApiConfig,
    availableModels,
    loadingModels,
    error,
    loadSettings: refreshSettings,
    fetchModels,
    confirmAndResetAISettings,
    switchActiveApiConfig,
    addApiConfig,
    updateApiConfig,
    deleteApiConfig, // This is from the useAiSettingsManager hook
  } = useAiSettingsManager(t);

  const {
    custom_promptsString,
    setcustom_promptsString,
    selectedPromptName,
    selectedVersionTimestamp,
    newPromptName,
    setNewPromptName,
    currentsummary_prompt,
    handlesummary_promptChange,
    handlePromptSelect,
    handleVersionSelect,
    handleSavePromptVersion,
    handleUpdateCurrentPromptVersion,
    handleCreateNewPrompt,
    handleDeleteSelectedVersion,
  } = usePromptManager(settings, refreshSettings, t);

  const handleSaveSettings = async () => {
    try {
      const settingsToSaveBackend: AiSettings = {
        ...settings,
        custom_prompts: custom_promptsString === "" ? null : custom_promptsString,
        summary_prompt: currentsummary_prompt,
      };

      console.log("Saving settings to backend:", settingsToSaveBackend);
      await invoke("save_ai_settings", { settings: settingsToSaveBackend });
      await Dialog.show({ title: t("ai.saveSuccess"), type: "success" }); // Added type
      await refreshSettings();
    } catch (err) {
      console.error(t("ai.saveFailure"), err);
      await Dialog.show({ title: `${t("ai.saveFailure")} ${err}`, type: "error" }); // Added type
    }
  };

  // --- API Config Modal Handlers ---
  const handleOpenAddApiConfigModal = () => {
    setConfigToEdit(null); // For a new config
    setIsConfigFormOpen(true);
  };

  const handleOpenEditApiConfigModal = (config: ApiConfig) => {
    setConfigToEdit(config); // For editing an existing config
    setIsConfigFormOpen(true);
  };

  const handleSaveApiConfigForm = (savedConfig: ApiConfig) => {
    if (configToEdit && savedConfig.id === configToEdit.id) {
      // Editing existing
      updateApiConfig(savedConfig);
    } else {
      // Adding new
      const newConfig = { ...savedConfig, id: savedConfig.id || crypto.randomUUID() };
      addApiConfig(newConfig);
    }
    setIsConfigFormOpen(false);
    setConfigToEdit(null);
    Dialog.show({
      title: t("ai.form.saveSuccess", "Configuration Saved"),
      content: t("ai.form.saveSuccessMessage", { name: savedConfig.name }), // Changed 'message' to 'content'
      type: "success", // Added type
    }).catch(console.error);
  };

  const handleCancelApiConfigForm = () => {
    setIsConfigFormOpen(false);
    setConfigToEdit(null);
  };

  const handleDeleteApiConfig = async (configId: string) => {
    const configToDelete = settings.api_configs.find((c) => c.id === configId);
    if (!configToDelete) return;

    // Define button texts using t function for localization
    const deleteButtonText = t("common.delete", "Delete");
    const cancelButtonText = t("common.cancel", "Cancel");

    const confirmation = await Dialog.show({
      title: t("ai.apiConfig.deleteConfirmTitle", "Delete API Configuration?"),
      // Changed 'message' to 'content'
      content: t(
        "ai.apiConfig.deleteConfirmMessage",
        "Are you sure you want to delete the API configuration '{{name}}'?",
        {
          name: configToDelete.name,
        },
      ),
      // Replaced okText, cancelText, style with type and buttons array
      type: "error", // 'style: "danger"' implies red background, map to type: "error"
      buttons: [
        { text: cancelButtonText, color: "white" }, // Neutral cancel button
        { text: deleteButtonText, color: "red" }, // Destructive action button
      ],
    });

    // Check against the actual text of the button
    if (confirmation.button === deleteButtonText) {
      try {
        deleteApiConfig(configId); // Call the function from the hook
        await Dialog.show({
          title: t("ai.apiConfig.deleteSuccessTitle", "Configuration Deleted"),
          // Changed 'message' to 'content'
          content: t("ai.apiConfig.deleteSuccessMessage", "The API configuration '{{name}}' has been deleted.", {
            name: configToDelete.name,
          }),
          type: "success", // Added type
        });
      } catch (err) {
        console.error("Failed to delete API config:", err);
        await Dialog.show({
          title: t("ai.apiConfig.deleteError", "Error Deleting Configuration"),
          type: "error", // Added type
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-panel-text text-2xl font-bold">{t("ai.title")}</h1>
      {error && <div className="text-red-500">{error}</div>}

      <ApiConfigSection
        activeApiConfig={activeApiConfig}
        api_configs={settings.api_configs || []}
        onActiveConfigSelect={switchActiveApiConfig}
        availableModels={availableModels}
        loadingModels={loadingModels}
        onFetchModels={fetchModels}
        t={t}
        onAddConfig={handleOpenAddApiConfigModal}
        onEditConfig={handleOpenEditApiConfigModal}
        onDeleteConfig={handleDeleteApiConfig}
      />

      <PromptManagementSection
        settings={settings}
        custom_promptsString={custom_promptsString}
        selectedPromptName={selectedPromptName}
        selectedVersionTimestamp={selectedVersionTimestamp}
        newPromptName={newPromptName}
        oncustom_promptsStringChange={setcustom_promptsString}
        onNewPromptNameChange={setNewPromptName}
        onPromptSelect={handlePromptSelect}
        onVersionSelect={handleVersionSelect}
        onCreateNewPrompt={handleCreateNewPrompt}
        onSavePromptVersion={handleSavePromptVersion}
        onUpdateCurrentPromptVersion={handleUpdateCurrentPromptVersion}
        onDeleteSelectedVersion={handleDeleteSelectedVersion}
        summary_prompt={currentsummary_prompt}
        onsummary_promptChange={handlesummary_promptChange}
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

      {/* Modal for ApiConfigForm */}
      {isConfigFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-20 p-4 backdrop-blur-sm dark:bg-opacity-40">
          <div
            className="w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-0 shadow-xl dark:bg-gray-800"
            style={{ maxHeight: "90vh" }}
          >
            <ApiConfigForm
              config={configToEdit}
              onSave={handleSaveApiConfigForm}
              onCancel={handleCancelApiConfigForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
