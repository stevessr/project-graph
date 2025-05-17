import { Dialog } from "../../components/dialog";
import React, { useState, useEffect } from "react";
import { AiSettings, ApiConfig } from "../../types/aiSettings";
import { invoke, fetch } from "../../utils/tauriApi";
import Button from "../../components/Button";
import { Save, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { parseLineFormat, formatNodesToLineString } from "./ai/promptUtils";
import { ApiConfigSection } from "./ai/ApiConfigSection";
import { PromptManagementSection } from "./ai/PromptManagementSection";

export default function AI() {
  const { t } = useTranslation("settings");

  const [settings, setSettings] = useState<AiSettings>({
    api_configs: [],
    active_config_id: null,
    prompt_collections: {},
    summary_prompt: null,
    custom_prompts: null,
  });
  const [activeApiConfig, setActiveApiConfig] = useState<ApiConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false); // Renamed from loading
  const [error, setError] = useState<string | null>(null);
  const [customPromptsString, setCustomPromptsString] = useState<string>("");

  const [selectedPromptName, setSelectedPromptName] = useState<string | null>(null);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<number | null>(null);
  const [newPromptName, setNewPromptName] = useState<string>("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettingsFromBackend: AiSettings = await invoke("load_ai_settings");

        if (loadedSettingsFromBackend.api_configs) {
          loadedSettingsFromBackend.api_configs = loadedSettingsFromBackend.api_configs.map((config) => ({
            ...config,
            api_type: config.api_type || "chat",
          }));
        }
        setSettings(loadedSettingsFromBackend);

        let currentActiveConfig: ApiConfig | null = null;
        if (loadedSettingsFromBackend.active_config_id && loadedSettingsFromBackend.api_configs) {
          currentActiveConfig =
            loadedSettingsFromBackend.api_configs.find((c) => c.id === loadedSettingsFromBackend.active_config_id) ||
            null;
        } else if (loadedSettingsFromBackend.api_configs && loadedSettingsFromBackend.api_configs.length > 0) {
          currentActiveConfig = loadedSettingsFromBackend.api_configs[0];
        }
        setActiveApiConfig(currentActiveConfig);

        let initialCustomPromptsString = "";
        if (
          loadedSettingsFromBackend.prompt_collections &&
          Object.keys(loadedSettingsFromBackend.prompt_collections).length > 0
        ) {
          const promptNames = Object.keys(loadedSettingsFromBackend.prompt_collections);
          const firstPromptName = promptNames[0];
          const firstPromptCollection = loadedSettingsFromBackend.prompt_collections[firstPromptName];

          if (firstPromptCollection && firstPromptCollection.versions.length > 0) {
            const latestVersion = firstPromptCollection.versions[0];
            initialCustomPromptsString = formatNodesToLineString([latestVersion.content]);
            setSelectedPromptName(firstPromptName);
            setSelectedVersionTimestamp(latestVersion.timestamp);
          } else {
            setSelectedPromptName(firstPromptName);
            setSelectedVersionTimestamp(null);
          }
        }

        if (initialCustomPromptsString === "" && loadedSettingsFromBackend.custom_prompts) {
          initialCustomPromptsString = loadedSettingsFromBackend.custom_prompts;
        }
        setCustomPromptsString(initialCustomPromptsString);
      } catch (err) {
        console.error(t("ai.loadFailure"), err);
        setError(`${t("ai.loadFailure")} ${err}`);
      }
    };
    loadSettings();
  }, [t]);

  const fetchModels = async () => {
    if (!activeApiConfig || !activeApiConfig.endpoint_url) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    setError(null);
    try {
      const modelsUrl = `${activeApiConfig.endpoint_url}/models`;
      const headers: Record<string, string> = {};
      if (activeApiConfig.api_key) {
        headers["Authorization"] = `Bearer ${activeApiConfig.api_key}`;
      }
      const response = await fetch(modelsUrl, { headers });
      const modelsData: any = await response.json();

      if (Array.isArray(modelsData)) {
        setAvailableModels(modelsData.map(String));
      } else if (modelsData && typeof modelsData === "object" && modelsData.data && Array.isArray(modelsData.data)) {
        setAvailableModels(modelsData.data.map((m: any) => m.id).map(String));
      } else {
        setError(t("ai.parseFailure"));
        setAvailableModels([]);
      }
    } catch (err) {
      console.error(t("ai.fetchFailure"), err);
      setError(`${t("ai.fetchFailure")} ${err}`);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (activeApiConfig) {
      // Only fetch if there's an active config
      fetchModels();
    }
  }, [activeApiConfig?.endpoint_url, activeApiConfig?.api_key, t]); // Refetch if endpoint or key changes

  const handleApiConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setActiveApiConfig((prevConfig) => {
      if (!prevConfig) {
        // This case should ideally be handled by ensuring an activeApiConfig is always set
        // if these fields are modifiable, or by providing a way to create a new config.
        // For now, we create a minimal new config.
        console.warn("activeApiConfig was null during change. Creating a temporary new config.");
        const tempId = `temp_${Date.now()}`; // Temporary ID
        return {
          id: tempId,
          name: t("ai.apiConfig.newName") || "New Config", // TODO: Translate
          api_type: "chat", // Default API type
          endpoint_url: "https://api.openai.com/v1",
          api_key: "sk-demo",
          default_model: "gpt-4o",
          notes: "none",
          [name]: value === "" ? null : value,
        } as ApiConfig;
      }
      return {
        ...prevConfig,
        [name]: value === "" && name !== "name" ? null : value,
      };
    });
  };

  const handleSummaryPromptChange = (value: string) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      summary_prompt: value === "" ? null : value,
    }));
  };

  const handleSavePromptVersion = async () => {
    if (!selectedPromptName || !customPromptsString.trim()) {
      await Dialog.show({ title: t("ai.selectPromptAndContentError") }); // TODO: Add key
      return;
    }
    try {
      const parsedPrompts = parseLineFormat(customPromptsString);
      if (selectedPromptName && parsedPrompts && parsedPrompts.length > 0) {
        await invoke("save_prompt_version", { promptName: selectedPromptName, content: parsedPrompts[0] });
        await Dialog.show({ title: t("ai.saveSuccess") });
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings);
        if (
          loadedSettings.prompt_collections &&
          loadedSettings.prompt_collections[selectedPromptName]?.versions.length > 0
        ) {
          const latestVersion = loadedSettings.prompt_collections[selectedPromptName].versions[0];
          setSelectedVersionTimestamp(latestVersion.timestamp);
        }
      } else {
        await Dialog.show({ title: t("ai.selectPromptToSaveVersion") });
      }
    } catch (err) {
      console.error(t("ai.saveVersionFailureConsole"), err); // TODO: Add key
      await Dialog.show({ title: t("ai.saveVersionFailure", { error: String(err) }) });
    }
  };

  const handleUpdateCurrentPromptVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({ title: t("ai.selectPromptAndVersionToUpdate") });
      return;
    }
    try {
      const parsedContent = parseLineFormat(customPromptsString);
      if (!parsedContent || parsedContent.length === 0) {
        await Dialog.show({ title: t("ai.contentCannotBeEmpty") });
        return;
      }
      await invoke("update_prompt_version", {
        promptName: selectedPromptName,
        timestamp: selectedVersionTimestamp,
        content: parsedContent[0],
      });
      await Dialog.show({ title: t("ai.updateVersionSuccess") });
      const loadedSettings: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettings);
      // Re-select to maintain context, content will be re-formatted from loaded settings
      if (loadedSettings.prompt_collections && loadedSettings.prompt_collections[selectedPromptName]) {
        const updatedCollection = loadedSettings.prompt_collections[selectedPromptName];
        const updatedVersion = updatedCollection.versions.find((v) => v.timestamp === selectedVersionTimestamp);
        if (updatedVersion) {
          setCustomPromptsString(formatNodesToLineString([updatedVersion.content]));
        } else {
          setCustomPromptsString("");
          setSelectedPromptName(null);
          setSelectedVersionTimestamp(null);
        }
      }
    } catch (err) {
      console.error(t("ai.updateVersionFailedConsole"), err); // TODO: Add key
      await Dialog.show({ title: t("ai.updateVersionFailed", { error: String(err) }) });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const apiConfigsToSend: ApiConfig[] = [...(settings.api_configs || [])];
      let activeConfigIdToSend: string | null = settings.active_config_id;

      if (activeApiConfig) {
        const existingConfigIndex = apiConfigsToSend.findIndex((c) => c.id === activeApiConfig.id);
        if (existingConfigIndex > -1) {
          apiConfigsToSend[existingConfigIndex] = activeApiConfig;
        } else {
          // If activeApiConfig has a temporary ID or is new, add it.
          // Ensure it has a permanent ID if it's a temp one.
          // For simplicity, we assume backend handles ID generation if it's new and doesn't have one,
          // or updates based on the provided ID.
          // If activeApiConfig.id starts with "temp_", it signals a new config.
          // The backend should handle this by creating a new entry.
          // For this example, we'll just push it. The backend "save_ai_settings"
          // would need logic to differentiate new vs existing.
          apiConfigsToSend.push(activeApiConfig);
        }
        activeConfigIdToSend = activeApiConfig.id;
      }

      const settingsToSaveBackend: AiSettings = {
        ...settings, // Preserve other settings like prompt_collections
        api_configs: apiConfigsToSend,
        active_config_id: activeConfigIdToSend,
        custom_prompts: customPromptsString === "" ? null : customPromptsString, // Save the raw string
        // summary_prompt is already part of 'settings' state
      };

      console.log("Saving settings to backend:", settingsToSaveBackend);
      await invoke("save_ai_settings", { settings: settingsToSaveBackend });
      await Dialog.show({ title: t("ai.saveSuccess") });

      const loadedSettingsFromBackend: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettingsFromBackend);

      let newActiveApiConfig: ApiConfig | null = null;
      if (loadedSettingsFromBackend.active_config_id && loadedSettingsFromBackend.api_configs) {
        newActiveApiConfig =
          loadedSettingsFromBackend.api_configs.find((c) => c.id === loadedSettingsFromBackend.active_config_id) ||
          null;
      } else if (loadedSettingsFromBackend.api_configs && loadedSettingsFromBackend.api_configs.length > 0) {
        newActiveApiConfig = loadedSettingsFromBackend.api_configs[0];
      }
      setActiveApiConfig(newActiveApiConfig);

      // Re-sync customPromptsString based on selected prompt/version or custom_prompts
      if (
        selectedPromptName &&
        selectedVersionTimestamp !== null &&
        loadedSettingsFromBackend.prompt_collections?.[selectedPromptName]
      ) {
        const collection = loadedSettingsFromBackend.prompt_collections[selectedPromptName];
        const version = collection.versions.find((v) => v.timestamp === selectedVersionTimestamp);
        if (version) {
          setCustomPromptsString(formatNodesToLineString([version.content]));
        } else {
          // Version not found, try latest of this prompt
          if (collection.versions.length > 0) {
            const latestVersion = collection.versions[0];
            setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
            setSelectedVersionTimestamp(latestVersion.timestamp); // Update to latest
          } else {
            // No versions for this prompt, clear
            setCustomPromptsString("");
            setSelectedPromptName(null); // Or keep selectedPromptName and clear version?
            setSelectedVersionTimestamp(null);
          }
        }
      } else if (loadedSettingsFromBackend.custom_prompts) {
        setCustomPromptsString(loadedSettingsFromBackend.custom_prompts);
        setSelectedPromptName(null); // Clear prompt/version selection if using legacy custom_prompts
        setSelectedVersionTimestamp(null);
      } else if (
        loadedSettingsFromBackend.prompt_collections &&
        Object.keys(loadedSettingsFromBackend.prompt_collections).length > 0
      ) {
        // Fallback: select first prompt, latest version
        const firstPromptName = Object.keys(loadedSettingsFromBackend.prompt_collections)[0];
        const firstCollection = loadedSettingsFromBackend.prompt_collections[firstPromptName];
        if (firstCollection.versions.length > 0) {
          const latest = firstCollection.versions[0];
          setSelectedPromptName(firstPromptName);
          setSelectedVersionTimestamp(latest.timestamp);
          setCustomPromptsString(formatNodesToLineString([latest.content]));
        } else {
          setCustomPromptsString("");
          setSelectedPromptName(firstPromptName); // Keep selected prompt name
          setSelectedVersionTimestamp(null);
        }
      } else {
        setCustomPromptsString(""); // No prompts or collections
        setSelectedPromptName(null);
        setSelectedVersionTimestamp(null);
      }
    } catch (err) {
      console.error(t("ai.saveFailure"), err);
      await Dialog.show({ title: `${t("ai.saveFailure")} ${err}` });
    }
  };

  async function confirmAndResetAISettings(): Promise<void> {
    try {
      const confirmation = await Dialog.show({
        title: t("ai.resetConfirmTitle") || "确认操作",
        content: t("ai.resetConfirmContent") || "您确定要重置 AI 设置吗？此操作不可撤销。",
        buttons: [
          { text: t("ai.cancelButton") || "取消" },
          {
            text: t("ai.resetConfirmButton") || "确认重置",
            color: "red", // Optional: for styling
          },
        ],
      });
      if (confirmation.button === (t("ai.resetConfirmButton") || "确认重置")) {
        await invoke("reset_ai_settings");
        // Reload settings after reset
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings); // Update main settings
        // Reset other relevant states
        setActiveApiConfig(
          loadedSettings.api_configs && loadedSettings.api_configs.length > 0 ? loadedSettings.api_configs[0] : null,
        );
        setCustomPromptsString(loadedSettings.custom_prompts || "");
        setSelectedPromptName(null);
        setSelectedVersionTimestamp(null);
        setNewPromptName("");
        await Dialog.show({ title: t("ai.resetSuccess") }); // TODO Add key
      }
    } catch (error) {
      console.error("显示对话框时发生错误:", error);
      await Dialog.show({ title: t("ai.dialogError", { error: String(error) }) }); // TODO Add key
    }
  }

  const handlePromptSelect = (promptNameKey: string) => {
    setSelectedPromptName(promptNameKey);
    if (settings.prompt_collections && settings.prompt_collections[promptNameKey]?.versions.length > 0) {
      const latestVersion = settings.prompt_collections[promptNameKey].versions[0];
      setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
      setSelectedVersionTimestamp(latestVersion.timestamp);
    } else {
      setCustomPromptsString("");
      setSelectedVersionTimestamp(null);
    }
  };

  const handleVersionSelect = (timestamp: number) => {
    setSelectedVersionTimestamp(timestamp);
    if (selectedPromptName && settings.prompt_collections && settings.prompt_collections[selectedPromptName]) {
      const selectedVersion = settings.prompt_collections[selectedPromptName].versions.find(
        (v) => v.timestamp === timestamp,
      );
      if (selectedVersion) {
        setCustomPromptsString(formatNodesToLineString([selectedVersion.content]));
      }
    }
  };

  const handleCreateNewPrompt = async () => {
    if (!newPromptName.trim()) {
      await Dialog.show({ title: t("ai.promptNameCannotBeEmpty") });
      return;
    }
    if (settings.prompt_collections && settings.prompt_collections[newPromptName.trim()]) {
      await Dialog.show({ title: t("ai.promptAlreadyExists", { name: newPromptName.trim() }) });
      return;
    }
    try {
      await invoke("save_prompt_version", {
        promptName: newPromptName.trim(),
        content: { text: t("ai.newPromptInitialContent") || "New prompt initial content..." },
      }); // TODO: Translate
      await Dialog.show({ title: t("ai.promptCreatedSuccessfully", { name: newPromptName.trim() }) });
      const loadedSettings: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettings);
      setSelectedPromptName(newPromptName.trim());
      // Select the newly created version (it should be the only one and the latest)
      const newCollection = loadedSettings.prompt_collections[newPromptName.trim()];
      if (newCollection && newCollection.versions.length > 0) {
        const newVersion = newCollection.versions[0];
        setCustomPromptsString(formatNodesToLineString([newVersion.content]));
        setSelectedVersionTimestamp(newVersion.timestamp);
      } else {
        setCustomPromptsString("");
        setSelectedVersionTimestamp(null);
      }
      setNewPromptName("");
    } catch (err) {
      console.error(t("ai.createPromptFailedConsole"), err); // TODO Add Key
      await Dialog.show({ title: t("ai.createPromptFailed", { error: String(err) }) });
    }
  };

  const handleDeleteSelectedVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({ title: t("ai.selectVersionToDeleteError") }); // TODO Add Key
      return;
    }
    try {
      const confirmed = await Dialog.show({
        title: t("ai.confirmDeleteVersion"),
        buttons: [{ text: t("ai.cancelButton") || "取消" }, { text: t("ai.confirmButton") || "确定", color: "red" }],
      });
      if (confirmed.button === (t("ai.confirmButton") || "确定")) {
        await invoke("delete_prompt_version", {
          promptName: selectedPromptName,
          timestamp: selectedVersionTimestamp,
        });
        await Dialog.show({ title: t("ai.versionDeletedSuccessfully") });
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings);
        if (
          loadedSettings.prompt_collections &&
          loadedSettings.prompt_collections[selectedPromptName]?.versions.length > 0
        ) {
          const latestVersion = loadedSettings.prompt_collections[selectedPromptName].versions[0];
          setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
          setSelectedVersionTimestamp(latestVersion.timestamp);
        } else {
          setCustomPromptsString("");
          setSelectedVersionTimestamp(null);
          if (!loadedSettings.prompt_collections || !loadedSettings.prompt_collections[selectedPromptName]) {
            setSelectedPromptName(null); // Clear prompt name if collection itself is gone
          }
        }
      }
    } catch (err) {
      console.error(t("ai.deleteVersionFailedConsole"), err); // TODO Add Key
      await Dialog.show({ title: t("ai.deleteVersionFailed", { error: String(err) }) });
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
        onFetchModels={fetchModels}
        t={t}
      />

      <PromptManagementSection
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
        summaryPrompt={settings.summary_prompt}
        onSummaryPromptChange={handleSummaryPromptChange}
        t={t}
      />

      <div className="flex justify-end gap-2">
        {" "}
        {/* Added gap-2 for spacing between buttons */}
        <Button
          onClick={handleSaveSettings}
          className="focus::ring-indigo-500 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <Save size={16} className="mr-2" />
          {t("ai.save")}
        </Button>
        <Button
          onClick={confirmAndResetAISettings}
          className="focus::ring-red-500 inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2" // Changed color to red for reset
        >
          <RotateCcw size={16} className="mr-2" />
          {t("ai.reset")}
        </Button>
      </div>
    </div>
  );
}
