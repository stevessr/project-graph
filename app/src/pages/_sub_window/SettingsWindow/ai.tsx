import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAiSettingsStore } from "../../../state/aiSettingsStore";
import { ApiConfig } from "../../../types/aiSettings";
import { Dialog } from "../../../components/dialog";
import { ApiConfigSection } from "./../../settings/ai/ApiConfigSection";
import ApiConfigForm from "./../../settings/ai/ApiConfigForm";
import { PromptManagementSection } from "./../../settings/ai/PromptManagementSection";
import Button from "../../../components/Button";
import { formatNodesToLineString } from "./../../settings/ai/promptUtils";
import { SubWindow } from "../../../core/service/SubWindow";
import { Rectangle } from "../../../core/dataStruct/shape/Rectangle";
import { Vector } from "../../../core/dataStruct/Vector";

export default function AI() {
  const { t } = useTranslation("settings");
  const [isSaving, setIsSaving] = useState(false);
  const [custom_promptsString, setcustom_promptsString] = useState("");
  const [newPromptName, setNewPromptName] = useState("");
  const [selectedPromptName, setSelectedPromptName] = useState<string | null>(null);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<number | null>(null);

  const {
    aiSettings: settings,
    availableModels,
    loadingModels,
    error,
    fetchModels,
    addAiConfig,
    updateAiConfig,
    deleteAiConfig,
    createPromptCollection,
    savePromptVersion,
    updatePromptVersion,
    deletePromptVersion,
    updateSummaryPrompt,
    saveSettings,
    resetAiSettings,
  } = useAiSettingsStore();

  // --- API Config Modal Handlers ---
  const handleOpenAddApiConfigModal = () => {
    const win = SubWindow.create({
      title: t("ai.form.addTitle"),
      children: <></>, // Will be set below
      rect: new Rectangle(new Vector(200, 100), new Vector(800, 600)),
    });

    // Update the window with the form that has the winId
    SubWindow.update(win.id, {
      children: (
        <ApiConfigForm
          winId={win.id}
          onSave={async (config) => {
            await addAiConfig(config);
            Dialog.show({
              title: t("ai.form.saveSuccess", "Configuration Saved"),
              content: t("ai.form.saveSuccessMessage", { name: config.name }),
              type: "success",
            }).catch(console.error);
          }}
          onCancel={() => {}}
        />
      ),
    });
  };

  const handleOpenEditApiConfigModal = (config: ApiConfig) => {
    const win = SubWindow.create({
      title: t("ai.form.editTitle"),
      children: <></>, // Will be set below
      rect: new Rectangle(new Vector(200, 100), new Vector(800, 600)),
    });

    // Update the window with the form that has the winId
    SubWindow.update(win.id, {
      children: (
        <ApiConfigForm
          config={config}
          winId={win.id}
          onSave={async (updatedConfig) => {
            await updateAiConfig({ ...updatedConfig, id: config.id });
            Dialog.show({
              title: t("ai.form.saveSuccess", "Configuration Saved"),
              content: t("ai.form.saveSuccessMessage", { name: updatedConfig.name }),
              type: "success",
            }).catch(console.error);
          }}
          onCancel={() => {}}
        />
      ),
    });
  };

  const handleDeleteApiConfig = async (configId: string) => {
    const configToDelete = settings?.api_configs.find((c) => c.id === configId);
    if (!configToDelete) return;

    const deleteButtonText = t("common.delete", "Delete");
    const cancelButtonText = t("common.cancel", "Cancel");

    const confirmation = await Dialog.show({
      title: t("ai.apiConfig.deleteConfirmTitle", "Delete API Configuration?"),
      content: t(
        "ai.apiConfig.deleteConfirmMessage",
        "Are you sure you want to delete the API configuration '{{name}}'?",
        { name: configToDelete.name },
      ),
      type: "error",
      buttons: [
        { text: cancelButtonText, color: "white" },
        { text: deleteButtonText, color: "red" },
      ],
    });

    if (confirmation.button === deleteButtonText) {
      deleteAiConfig(configId);
    }
  };

  const handleModelChange = (modelId: string) => {
    const activeApiConfig = settings?.api_configs.find((c) => c.id === settings.active_config_id);
    if (activeApiConfig) {
      updateAiConfig({ ...activeApiConfig, model: modelId });
    }
  };

  // --- Prompt Management Handlers ---
  const handleCreateNewPrompt = async () => {
    if (!newPromptName.trim()) return;
    await createPromptCollection(newPromptName.trim());
    setNewPromptName("");
  };

  const handleSavePromptVersion = async () => {
    if (!selectedPromptName || !custom_promptsString.trim()) return;
    await savePromptVersion(selectedPromptName, custom_promptsString);
  };

  const handleUpdateCurrentPromptVersion = async () => {
    if (!selectedPromptName || !selectedVersionTimestamp || !custom_promptsString.trim()) return;
    await updatePromptVersion(selectedPromptName, selectedVersionTimestamp, custom_promptsString);
  };

  const handleDeleteSelectedVersion = async () => {
    if (!selectedPromptName || !selectedVersionTimestamp) return;
    await deletePromptVersion(selectedPromptName, selectedVersionTimestamp);
    setSelectedVersionTimestamp(null); // Reset version selection
  };

  const handlePromptSelect = (promptName: string) => {
    setSelectedPromptName(promptName);
    setSelectedVersionTimestamp(null); // Reset version selection on new prompt selection
  };

  const handleVersionSelect = (timestamp: number) => {
    setSelectedVersionTimestamp(timestamp);
  };

  const handleSummaryPromptChange = (value: string) => {
    updateSummaryPrompt(value);
  };

  useEffect(() => {
    if (selectedPromptName && selectedVersionTimestamp && settings?.prompt_collections) {
      const version = settings.prompt_collections[selectedPromptName]?.versions.find(
        (v) => v.timestamp === selectedVersionTimestamp,
      );
      if (version) {
        setcustom_promptsString(formatNodesToLineString(version.content.children ?? null));
      }
    } else {
      // Optionally clear the editor when no version is selected
      setcustom_promptsString("");
    }
  }, [selectedPromptName, selectedVersionTimestamp, settings?.prompt_collections]);

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      Dialog.show({
        title: t("ai.saveSuccessTitle", "Settings Saved"),
        content: t("ai.saveSuccessMessage", "Your AI settings have been saved successfully."),
        type: "success",
      });
    } catch (error) {
      console.error("Failed to save settings manually:", error);
      Dialog.show({
        title: t("ai.saveErrorTitle", "Save Failed"),
        content: t("ai.saveErrorMessage", "Failed to save settings. Please try again."),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    const confirmButtonText = t("common.confirm", "Confirm");
    const cancelButtonText = t("common.cancel", "Cancel");

    const confirmation = await Dialog.show({
      title: t("ai.resetConfirmTitle", "Reset All AI Settings?"),
      content: t(
        "ai.resetConfirmMessage",
        "Are you sure you want to reset all AI settings? This action cannot be undone.",
      ),
      type: "error",
      buttons: [
        { text: cancelButtonText, color: "white" },
        { text: confirmButtonText, color: "red" },
      ],
    });

    if (confirmation.button === confirmButtonText) {
      await resetAiSettings();
      // Optionally, reset local component state as well
      setcustom_promptsString("");
      setNewPromptName("");
      setSelectedPromptName(null);
      setSelectedVersionTimestamp(null);
      Dialog.show({
        title: t("ai.resetSuccessTitle", "Settings Reset"),
        content: t("ai.resetSuccessMessage", "All AI settings have been reset to their defaults."),
        type: "success",
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-panel-text text-2xl font-bold">{t("ai.title")}</h1>
        <div className="flex gap-2">
          <Button onClick={handleManualSave} disabled={isSaving}>
            {isSaving ? t("ai.saving", "Saving...") : t("ai.manualSave", "Manual Save")}
          </Button>
          <Button onClick={handleResetSettings} variant="destructive">
            {t("ai.reset", "Reset Settings")}
          </Button>
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {settings && (
        <div className="flex flex-grow flex-col gap-4">
          <ApiConfigSection
            api_configs={settings.api_configs || []}
            availableModels={availableModels}
            loadingModels={loadingModels}
            onFetchModels={() => {
              const activeConfig = settings?.api_configs.find((c) => c.id === settings.active_config_id);
              if (activeConfig) {
                fetchModels(activeConfig);
              }
            }}
            t={t}
            onAddConfig={handleOpenAddApiConfigModal}
            onEditConfig={handleOpenEditApiConfigModal}
            onDeleteConfig={handleDeleteApiConfig}
            onModelChange={handleModelChange}
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
            summary_prompt={settings.summary_prompt}
            onsummary_promptChange={handleSummaryPromptChange}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
