import { Dialog } from "../../components/dialog";
import React, { useState, useEffect } from "react";
import {
  AiSettings,
  ApiConfig,
  // PromptCollection, // Removed unused import
  // PromptVersion, // Removed unused import
  PromptContentNode, // Renamed from PromptNode in types
} from "../../types/aiSettings";
import { invoke, fetch } from "../../utils/tauriApi";
import { FieldGroup, Field } from "../../components/Field";
import Button from "../../components/Button";
import { Brain, Download, Save, FileText, RotateCcw, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import Input from "../../components/Input";
import Select from "../../components/Select";

// Interface definitions are now imported from "../../types/aiSettings"

export default function AI() {
  const { t } = useTranslation("settings"); // Use the translation hook

  // Update initial state to match the new AiSettings structure
  const [settings, setSettings] = useState<AiSettings>({
    api_configs: [],
    active_config_id: null,
    prompt_collections: {},
    summary_prompt: null,
    custom_prompts: null,
  });
  const [activeApiConfig, setActiveApiConfig] = useState<ApiConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPromptsString, setCustomPromptsString] = useState<string>(""); // State for line-based string

  // State for managing selected prompt and version
  const [selectedPromptName, setSelectedPromptName] = useState<string | null>(null);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<number | null>(null);

  // State for managing the name of a new prompt to be created
  const [newPromptName, setNewPromptName] = useState<string>("");

  // --- Helper functions for parsing/formatting the new line format ---

  // Parses the line format string into PromptNode array
  const parseLineFormat = (text: string): PromptContentNode[] | null => {
    if (!text || !text.trim()) {
      return null;
    }
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const nodes: PromptContentNode[] = [];
    lines.forEach((line) => {
      const parts = line.split(":");
      const parentText = parts[0]?.trim();
      if (!parentText) return; // Skip lines without parent text

      const parentNode: PromptContentNode = { text: parentText, children: null };
      if (parts.length > 1 && parts[1]?.trim()) {
        const childTexts = parts[1]
          .split(/[,、]/)
          .map((t) => t.trim())
          .filter((t) => t);
        if (childTexts.length > 0) {
          parentNode.children = childTexts.map((childText) => ({ text: childText }));
        }
      }
      nodes.push(parentNode);
    });
    return nodes.length > 0 ? nodes : null;
  };

  // Formats PromptContentNode array back into the line format string
  const formatNodesToLineString = (nodes: PromptContentNode[] | null): string => {
    if (!nodes) {
      return "";
    }
    return nodes
      .map((node) => {
        let line = node.text;
        if (node.children && node.children.length > 0) {
          line += ": " + node.children.map((child) => child.text).join(", "); // Use comma as standard separator
        }
        return line;
      })
      .join("\n");
  };

  // Load settings on component mount and handle prompt collections
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettingsFromBackend: AiSettings = await invoke("load_ai_settings");

        // Fix: Provide a default value for api_type if it's missing
        if (loadedSettingsFromBackend.api_configs) {
          loadedSettingsFromBackend.api_configs = loadedSettingsFromBackend.api_configs.map((config) => {
            if (!config.api_type) {
              // Default to "chat" if api_type is missing for backward compatibility.
              return { ...config, api_type: "chat" };
            }
            return config;
          });
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

        // Handle loading prompt collections and selecting the latest version of the first one
        if (
          loadedSettingsFromBackend.prompt_collections &&
          Object.keys(loadedSettingsFromBackend.prompt_collections).length > 0
        ) {
          const promptNames = Object.keys(loadedSettingsFromBackend.prompt_collections);
          const firstPromptName = promptNames[0];
          const firstPromptCollection = loadedSettingsFromBackend.prompt_collections[firstPromptName];

          if (firstPromptCollection && firstPromptCollection.versions.length > 0) {
            const latestVersion = firstPromptCollection.versions[0];
            setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
            setSelectedPromptName(firstPromptName);
            setSelectedVersionTimestamp(latestVersion.timestamp);
          } else {
            setCustomPromptsString("");
            setSelectedPromptName(firstPromptName);
            setSelectedVersionTimestamp(null);
          }
        } else {
          setCustomPromptsString("");
          setSelectedPromptName(null);
          setSelectedVersionTimestamp(null);
        }

        // If customPromptsString is still empty after checking prompt_collections,
        // load from loadedSettings.custom_prompts if available.
        if (
          customPromptsString === "" &&
          loadedSettingsFromBackend.custom_prompts !== null &&
          loadedSettingsFromBackend.custom_prompts !== undefined
        ) {
          setCustomPromptsString(loadedSettingsFromBackend.custom_prompts);
        }
      } catch (err) {
        console.error(t("ai.loadFailure"), err); // Use translation
        setError(`${t("ai.loadFailure")} ${err}`); // Add translation key
      }
    };

    loadSettings();
  }, [t, customPromptsString]); // Added customPromptsString to dependencies to avoid stale closure issues

  // Fetch models when api_endpoint or api_key changes, or on manual refresh
  const fetchModels = async () => {
    if (!activeApiConfig || !activeApiConfig.endpoint_url) {
      setAvailableModels([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const modelsUrl = `${activeApiConfig.endpoint_url}/models`;
      const headers: Record<string, string> = {};
      if (activeApiConfig.api_key) {
        headers["Authorization"] = `Bearer ${activeApiConfig.api_key}`;
      }
      const models: any = await fetch(modelsUrl, { headers }).then((res) => res.json());

      if (Array.isArray(models)) {
        setAvailableModels(models.map(String));
      } else if (models && typeof models === "object" && models.data && Array.isArray(models.data)) {
        setAvailableModels(models.data.map((m: any) => m.id).map(String));
      } else {
        setError(t("ai.parseFailure"));
        setAvailableModels([]);
      }
    } catch (err) {
      console.error(t("ai.fetchFailure"), err);
      setError(`${t("ai.fetchFailure")} ${err}`);
      setAvailableModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [activeApiConfig, t]); // Refetch models when activeApiConfig changes

  // Unified input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "custom_prompts_string") {
      setCustomPromptsString(value);
    } else if (name === "summary_prompt") {
      setSettings((prevSettings) => ({
        ...prevSettings,
        summary_prompt: value === "" ? null : value,
      }));
    } else if (["endpoint_url", "api_key", "api_type", "default_model", "name", "notes"].includes(name)) {
      // Update activeApiConfig for API specific fields
      setActiveApiConfig((prevConfig) => {
        if (!prevConfig) return null; // Should ideally not happen if UI is enabled
        return {
          ...prevConfig,
          [name]: value === "" && name !== "name" ? null : value, // name cannot be null
        };
      });
    } else {
      // Fallback for any other settings fields directly on AiSettings (if any)
      // This part might need review if other direct AiSettings fields are added
      setSettings((prevSettings) => ({
        ...prevSettings,
        [name]: value === "" ? null : value,
      }));
    }
  };
  const handleSavePromptVersion = async () => {
    try {
      // Parse the line format string back into structured data before saving
      const parsedPrompts = parseLineFormat(customPromptsString);

      // Use the new save_prompt_version command
      if (selectedPromptName && parsedPrompts && parsedPrompts.length > 0) {
        // Assuming the first node in the parsed prompts is the main content
        await invoke("save_prompt_version", { promptName: selectedPromptName, content: parsedPrompts[0] });
        await Dialog.show({
          title: t("ai.saveSuccess"), // TODO: Add specific translation for version save success?
        });
        // After saving a new version, reload settings to update the UI
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings);
        // Select the newly saved version (which should be the latest)
        if (
          loadedSettings.prompt_collections &&
          loadedSettings.prompt_collections[selectedPromptName]?.versions.length > 0
        ) {
          const latestVersion = loadedSettings.prompt_collections[selectedPromptName].versions[0];
          setSelectedVersionTimestamp(latestVersion.timestamp);
        }
      } else {
        // Handle case where no prompt is selected or content is empty
        await Dialog.show({
          title: t("ai.selectPromptToSaveVersion"), // TODO: Add translation key
        });
      }
    } catch (err) {
      console.error("保存提示词版本失败", err); // TODO: Translate console error
      alert(t("ai.saveVersionFailure", { error: err })); // TODO: Add translation key
    }
  };

  // Function to handle updating the content of the currently selected prompt version
  const handleUpdateCurrentPromptVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({
        title: t("ai.selectPromptAndVersionToUpdate"), // TODO: Add translation key
      });
      return;
    }

    try {
      const parsedContent = parseLineFormat(customPromptsString);
      if (!parsedContent || parsedContent.length === 0) {
        await Dialog.show({
          title: t("ai.contentCannotBeEmpty"), // TODO: Add translation key
        });
        return;
      }

      // Assuming the first node in the parsed prompts is the main content
      await invoke("update_prompt_version", {
        promptName: selectedPromptName,
        timestamp: selectedVersionTimestamp,
        content: parsedContent[0],
      });

      await Dialog.show({
        title: t("ai.updateVersionSuccess"), // TODO: Add translation key
      });

      // After updating, reload settings to ensure UI is in sync with backend state
      const loadedSettings: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettings);
      // Re-select the previously selected prompt and version to maintain context
      // This might require finding the updated version in the reloaded settings
      if (loadedSettings.prompt_collections && loadedSettings.prompt_collections[selectedPromptName]) {
        const updatedCollection = loadedSettings.prompt_collections[selectedPromptName];
        const updatedVersion = updatedCollection.versions.find((v) => v.timestamp === selectedVersionTimestamp);
        if (updatedVersion) {
          setCustomPromptsString(formatNodesToLineString([updatedVersion.content]));
          // setSelectedVersionTimestamp remains the same
        } else {
          // Handle case where the version might have been deleted or not found after reload (unlikely in this scenario)
          setCustomPromptsString("");
          setSelectedPromptName(null); // Clear selected prompt if version not found
          setSelectedVersionTimestamp(null);
        }
      }
    } catch (err) {
      console.error("更新提示词版本失败", err); // TODO: Translate console error
      await Dialog.show({
        title: t("ai.updateVersionFailed"),
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Construct settings to send to backend.
      // The UI currently edits one active API configuration at a time.
      // If activeApiConfig is null but the user has made changes in the UI fields,
      // we might need to create a new config or decide how to handle this.
      // For now, we assume if activeApiConfig is being edited, it exists.

      const apiConfigsToSend: ApiConfig[] = settings.api_configs || [];
      let activeConfigIdToSend: string | null = settings.active_config_id;

      if (activeApiConfig) {
        // If an activeApiConfig is being edited, update it in the list or add it if new
        const existingConfigIndex = apiConfigsToSend.findIndex((c) => c.id === activeApiConfig.id);
        if (existingConfigIndex > -1) {
          apiConfigsToSend[existingConfigIndex] = activeApiConfig;
        } else {
          // This case implies activeApiConfig was somehow detached or is new.
          // For simplicity, we'll assume the UI ensures activeApiConfig.id is valid
          // or a new one is generated before this point if creating a new config.
          // If the UI doesn't support creating new API configs directly through these fields,
          // this branch might not be hit.
          apiConfigsToSend.push(activeApiConfig);
        }
        activeConfigIdToSend = activeApiConfig.id;
      }
      // If no activeApiConfig, but UI fields were somehow populated and saved,
      // this logic would need to handle creating a new ApiConfig.
      // Current UI flow seems to load an existing config into activeApiConfig.

      const settingsToSaveBackend: AiSettings = {
        api_configs: apiConfigsToSend,
        active_config_id: activeConfigIdToSend,
        prompt_collections: settings.prompt_collections,
        summary_prompt: settings.summary_prompt,
        custom_prompts: customPromptsString === "" ? null : customPromptsString,
      };

      console.log("Saving settings to backend:", settingsToSaveBackend);
      await invoke("save_ai_settings", { settings: settingsToSaveBackend });
      await Dialog.show({
        title: t("ai.saveSuccess"),
      });

      // After saving, reload settings to ensure UI is in sync with backend state
      const loadedSettingsFromBackend: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettingsFromBackend); // Update the main settings state

      // Update activeApiConfig based on the reloaded settings
      let newActiveApiConfig: ApiConfig | null = null;
      if (loadedSettingsFromBackend.active_config_id && loadedSettingsFromBackend.api_configs) {
        newActiveApiConfig =
          loadedSettingsFromBackend.api_configs.find((c) => c.id === loadedSettingsFromBackend.active_config_id) ||
          null;
      } else if (loadedSettingsFromBackend.api_configs && loadedSettingsFromBackend.api_configs.length > 0) {
        // Fallback to the first config if no active_config_id is set but configs exist
        newActiveApiConfig = loadedSettingsFromBackend.api_configs[0];
        // Optionally, update the active_config_id in the backend here if desired,
        // or let the user explicitly set an active config.
      }
      setActiveApiConfig(newActiveApiConfig);

      // Re-select the previously selected prompt and version to maintain context
      if (
        selectedPromptName &&
        selectedVersionTimestamp !== null &&
        loadedSettingsFromBackend.prompt_collections &&
        loadedSettingsFromBackend.prompt_collections[selectedPromptName]
      ) {
        const updatedCollection = loadedSettingsFromBackend.prompt_collections[selectedPromptName];
        const updatedVersion = updatedCollection.versions.find((v) => v.timestamp === selectedVersionTimestamp);
        if (updatedVersion) {
          setCustomPromptsString(formatNodesToLineString([updatedVersion.content]));
        } else {
          setCustomPromptsString("");
          setSelectedPromptName(null);
          setSelectedVersionTimestamp(null);
        }
      } else if (loadedSettingsFromBackend.custom_prompts) {
        setCustomPromptsString(loadedSettingsFromBackend.custom_prompts);
      } else if (
        // If no specific prompt was selected, try to load the latest of the first collection
        loadedSettingsFromBackend.prompt_collections &&
        Object.keys(loadedSettingsFromBackend.prompt_collections).length > 0
      ) {
        const firstPromptName = Object.keys(loadedSettingsFromBackend.prompt_collections)[0];
        const firstPromptCollection = loadedSettingsFromBackend.prompt_collections[firstPromptName];
        if (firstPromptCollection && firstPromptCollection.versions.length > 0) {
          const latestVersion = firstPromptCollection.versions[0];
          setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
          setSelectedPromptName(firstPromptName);
          setSelectedVersionTimestamp(latestVersion.timestamp);
        }
      }
    } catch (err) {
      console.error(t("ai.saveFailure"), err);
      alert(`${t("ai.saveFailure")} ${err}`);
    }
  };

  const reset_ai_settings = async () => {
    invoke("reset_ai_settings");
  };

  // Function to handle prompt selection from the list/dropdown
  const handlePromptSelect = (promptName: string) => {
    setSelectedPromptName(promptName);
    // When a new prompt is selected, default to showing its latest version
    if (settings.prompt_collections && settings.prompt_collections[promptName]?.versions.length > 0) {
      const latestVersion = settings.prompt_collections[promptName].versions[0];
      setCustomPromptsString(formatNodesToLineString([latestVersion.content]));
      setSelectedVersionTimestamp(latestVersion.timestamp);
    } else {
      // If the selected prompt has no versions, clear the editor
      setCustomPromptsString("");
      setSelectedVersionTimestamp(null);
    }
  };

  // Function to handle version selection from the dropdown
  const handleVersionSelect = (timestamp: number) => {
    setSelectedVersionTimestamp(timestamp);
    if (selectedPromptName && settings.prompt_collections && settings.prompt_collections[selectedPromptName]) {
      const selectedCollection = settings.prompt_collections[selectedPromptName];
      const selectedVersion = selectedCollection.versions.find((version) => version.timestamp === timestamp);
      if (selectedVersion) {
        setCustomPromptsString(formatNodesToLineString([selectedVersion.content]));
      }
    }
  };

  // Function to handle creating a new prompt collection
  const handleCreateNewPrompt = async () => {
    if (!newPromptName.trim()) {
      await Dialog.show({
        title: t("ai.promptNameCannotBeEmpty"),
      });
      return;
    }
    if (settings.prompt_collections && settings.prompt_collections[newPromptName.trim()]) {
      await Dialog.show({
        title: t("ai.promptAlreadyExists", { name: newPromptName.trim() }),
      });
      return;
    }

    try {
      // Create a new empty prompt collection in the backend
      await invoke("save_prompt_version", { promptName: newPromptName.trim(), content: { text: "" } }); // Save an empty initial version
      await Dialog.show({
        title: t("ai.saveSuccess"),
      });
      await Dialog.show({
        title: t("ai.promptCreatedSuccessfully", { name: newPromptName.trim() }),
      });

      // Reload settings to update the UI with the new prompt
      const loadedSettings: AiSettings = await invoke("load_ai_settings");
      setSettings(loadedSettings);

      // Automatically select the newly created prompt
      setSelectedPromptName(newPromptName.trim());
      setCustomPromptsString(""); // Clear editor for new prompt
      setSelectedVersionTimestamp(null); // No versions initially

      setNewPromptName(""); // Clear the input field
    } catch (err) {
      console.error("创建提示词失败", err); // TODO: Translate console error
      await Dialog.show({
        title: t("ai.createPromptFailed", { error: err }),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {" "}
      {/* Use flex column layout and padding */}
      <h1 className="text-panel-text text-2xl font-bold">{t("ai.title")}</h1> {/* Use translation */}
      {error && <div className="text-red-500">{error}</div>} {/* Error message */}
      <FieldGroup title={t("ai.apiConfig.title")} icon={<Brain />}>
        {" "}
        {/* Group API settings */}
        <Field title={t("ai.apiConfig.endpoint.title")} description={t("ai.apiConfig.endpoint.description")}>
          {/* Use translation */}
          <Input
            name="api_endpoint"
            value={activeApiConfig?.endpoint_url || ""}
            onChange={(value) =>
              handleInputChange({ target: { name: "endpoint_url", value } } as React.ChangeEvent<HTMLInputElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </Field>
        <Field title={t("ai.apiConfig.key.title")} description={t("ai.apiConfig.key.description")}>
          {/* Use translation */}
          <Input
            type="password"
            name="api_key"
            value={activeApiConfig?.api_key || ""}
            onChange={(value) =>
              handleInputChange({ target: { name: "api_key", value } } as React.ChangeEvent<HTMLInputElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </Field>
        {/* Add API Type Selection Field */}
        <Field title={t("ai.apiConfig.apiType.title")} description={t("ai.apiConfig.apiType.description")}>
          <Select
            name="api_type"
            value={activeApiConfig?.api_type || ""}
            onChange={(value) =>
              handleInputChange({ target: { name: "api_type", value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            options={[
              { value: "responses", label: "Responses API" },
              { value: "chat", label: "Chat Completions" },
              { value: "gemini", label: "Gemini" },
            ]}
          />
        </Field>
        <Field title={t("ai.apiConfig.model.title")} description={t("ai.apiConfig.model.description")}>
          {" "}
          {/* Use translation */}
          <div className="flex items-center gap-2">
            <Select
              name="selected_model"
              value={activeApiConfig?.default_model || ""}
              onChange={(value) =>
                handleInputChange({ target: { name: "default_model", value } } as React.ChangeEvent<HTMLSelectElement>)
              }
              disabled={loading || availableModels.length === 0}
              className="ai-model-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              options={[
                { value: "", label: loading ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select") },
                ...availableModels.map((model) => ({ label: model, value: model })),
              ]}
            />
            <Button
              onClick={fetchModels}
              disabled={loading || !activeApiConfig?.endpoint_url}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" // Use Button component and apply styles
            >
              {loading ? t("ai.apiConfig.model.refreshing") : <Download size={16} />} {/* Use translation */}
            </Button>
          </div>
        </Field>
      </FieldGroup>
      <FieldGroup title={t("ai.prompts.title")} icon={<FileText />}>
        {" "}
        {/* Use translation */}
        {/* Prompt Creation */}
        <Field title="创建新提示词" description="输入新提示词的名称并创建">
          {" "}
          {/* TODO: Add translation */}
          <div className="flex items-center gap-2">
            <Input
              name="new_prompt_name"
              value={newPromptName}
              onChange={setNewPromptName}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder={t("ai.newPromptNamePlaceholder")}
            />
            <Button
              onClick={handleCreateNewPrompt}
              disabled={!newPromptName.trim()}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" // Use Button component and apply styles
            >
              <Plus />
              创建
            </Button>
          </div>
        </Field>
        {/* Prompt Selection and Version Selection */}
        <div className="flex items-center gap-2">
          <Field title="选择提示词" description="从已保存的提示词中选择">
            {" "}
            {/* TODO: Add translation */}
            <Select
              name="selected_prompt"
              value={selectedPromptName || ""}
              onChange={(value) => handlePromptSelect(value)}
              disabled={true}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              options={[
                { value: "", label: t("ai.selectAPrompt") },
                ...(settings.prompt_collections
                  ? Object.keys(settings.prompt_collections).map((name) => ({ label: name, value: name }))
                  : []),
              ]}
            />
          </Field>
          {selectedPromptName &&
            settings.prompt_collections &&
            settings.prompt_collections[selectedPromptName]?.versions.length > 0 && (
              <Field title="选择版本" description="选择该提示词的历史版本">
                {" "}
                {/* TODO: Add translation */}
                <div className="flex items-center gap-2">
                  {" "}
                  {/* Add a flex container for select and button */}
                  <Select
                    name="selected_version"
                    value={selectedVersionTimestamp?.toString() || ""} // Fix: Convert number to string for Select value
                    onChange={(value) => handleVersionSelect(Number(value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    options={settings.prompt_collections[selectedPromptName].versions.map((version) => ({
                      label: new Date(version.timestamp).toLocaleString(), // Format timestamp
                      value: version.timestamp.toString(),
                    }))}
                  />
                  {/* Add Delete Button */}
                  {selectedVersionTimestamp !== null && ( // Only show delete button if a version is selected
                    <Button
                      onClick={async () => {
                        if (selectedPromptName && selectedVersionTimestamp !== null) {
                          const confirmed = await Dialog.show({
                            title: t("ai.confirmDeleteVersion"),
                            buttons: [
                              { text: "取消", color: "white" },
                              { text: "确定", color: "red" },
                            ],
                          });
                          if (confirmed.button === "确定") {
                            // Check if user clicked "确定" button text
                            try {
                              await invoke("delete_prompt_version", {
                                promptName: selectedPromptName,
                                timestamp: selectedVersionTimestamp,
                              });
                              await Dialog.show({
                                title: t("ai.versionDeletedSuccessfully"),
                              });
                              // After deletion, reload settings and update UI
                              const loadedSettings: AiSettings = await invoke("load_ai_settings");
                              setSettings(loadedSettings);
                              // Attempt to select the latest version of the same prompt, or clear if none left
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
                                // If the collection is now empty, also clear the selected prompt name
                                if (
                                  !loadedSettings.prompt_collections ||
                                  !loadedSettings.prompt_collections[selectedPromptName]
                                ) {
                                  setSelectedPromptName(null);
                                }
                              }
                            } catch (err) {
                              console.error("删除版本失败", err); // TODO: Translate console error
                              await Dialog.show({
                                title: t("ai.deleteVersionFailed"),
                              });
                            }
                          }
                        }
                      }}
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" // Use Button component and apply styles
                    >
                      删除 {/* TODO: Add translation */}
                    </Button>
                  )}
                  {/* Add Save Current Version Button */}
                  {selectedPromptName && selectedVersionTimestamp !== null && customPromptsString.trim() && (
                    <Button
                      onClick={handleUpdateCurrentPromptVersion}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <Save size={14} className="mr-1" />
                      更新 {/* TODO: Add translation key */}
                    </Button>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePromptVersion}
                      disabled={!(!selectedPromptName || !customPromptsString.trim())}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Save size={14} className="mr-1" />
                      新版本 {/* TODO: Add translation key */}
                    </Button>
                  </div>
                </div>
              </Field>
            )}
        </div>
        <Field title={t("ai.prompts.systemPrompt.title")} description={t("ai.prompts.systemPrompt.description")}>
          {" "}
          {/* Use translation */}
          {/* Reverted back to textarea */}
          <Input
            name="custom_prompts_string" // Use new name for handler
            rows={10}
            value={customPromptsString} // Bind to string state
            onChange={(value) =>
              handleInputChange({
                target: { name: "custom_prompts_string", value },
              } as React.ChangeEvent<HTMLTextAreaElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm sm:ring-indigo-500"
            placeholder={t("ai.prompts.lineFormatPlaceholder")} // Add new translation key
          />
          <p className="text-panel-text-lighter mt-1 text-xs">
            {t("ai.prompts.lineFormatHint")} {/* Add new translation key */}
          </p>
        </Field>
        {/* Add Field for Custom Summary Prompt */}
        <Field title={t("ai.prompts.summaryPrompt.title")} description={t("ai.prompts.summaryPrompt.description")}>
          <Input
            name="summary_prompt" // Name matches the state key
            rows={3} // Adjust rows as needed
            value={settings.summary_prompt || ""} // Bind to state
            onChange={(value) =>
              handleInputChange({ target: { name: "summary_prompt", value } } as React.ChangeEvent<HTMLTextAreaElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={t("ai.prompts.summaryPrompt.placeholder")} // Add placeholder translation key
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          className="focus::ring-indigo-500 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <Save size={16} className="mr-2" />
          {t("ai.save")} {/* Use translation */}
        </Button>
        <Button
          onClick={reset_ai_settings}
          className="focus::ring-indigo-500 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <RotateCcw size={16} className="mr-2" />
          {t("ai.reset")} {/* Use translation */}
        </Button>
      </div>
    </div>
  );
}
