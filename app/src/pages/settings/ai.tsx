import { Dialog } from "../../components/dialog";
import React, { useState, useEffect } from "react";
import { invoke, fetch } from "../../utils/tauriApi";
import { readTextFile, writeFile } from "@tauri-apps/plugin-fs"; // Removed unused 'create' import
// Removed unused imports: js-yaml, react-simple-code-editor, prismjs
import { FieldGroup, Field } from "../../components/Field";
import Button from "../../components/Button";
import { Brain, Download, Save, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

import Input from "../../components/Input";
import Select from "../../components/Select";

// Define the structure for a single prompt node (matches Rust struct)
interface PromptNode {
  text: string;
  node_type?: string | null; // Optional type, matches Rust Option<String>
  params?: any | null; // Optional params, matches Rust Option<serde_json::Value>
  children?: PromptNode[] | null; // Optional children, matches Rust Option<Vec<PromptNode>>
}

// Define the structure for a specific version of a prompt (matches Rust struct)
interface PromptVersion {
  content: PromptNode;
  timestamp: number; // i64 in Rust maps to number in TS
}

// Define the structure for a collection of prompt versions (matches Rust struct)
interface PromptCollection {
  name: string; // 提示词的名称，用于标识和显示
  versions: PromptVersion[]; // 存储该提示词的所有版本
  // Optional: can add a field to mark the current active version
}

// Define the structure for AI settings (should match the Rust struct)
interface AiSettings {
  api_endpoint?: string | null;
  api_key?: string | null;
  selected_model?: string | null;
  prompt_collections?: Record<string, PromptCollection> | null; // HashMap<String, PromptCollection> in Rust
  api_type?: string | null;
  summary_prompt?: string | null; // Add field for custom summary prompt
  custom_prompts?: string | null;
}

export default function AI() {
  const { t } = useTranslation("settings"); // Use the translation hook

  // Update initial state to match the new AiSettings structure
  const [settings, setSettings] = useState<AiSettings>({
    api_endpoint: null,
    api_key: null,
    selected_model: null,
    prompt_collections: {}, // Initialize as empty object
    api_type: "chat", // Set default to "chat"
    summary_prompt: null, // Initialize summary prompt
    custom_prompts: null, // Initialize custom prompts
  });
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
  const parseLineFormat = (text: string): PromptNode[] | null => {
    if (!text || !text.trim()) {
      return null;
    }
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const nodes: PromptNode[] = [];
    lines.forEach((line) => {
      const parts = line.split(":");
      const parentText = parts[0]?.trim();
      if (!parentText) return; // Skip lines without parent text

      const parentNode: PromptNode = { text: parentText, children: null };
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

  // Formats PromptNode array back into the line format string
  const formatNodesToLineString = (nodes: PromptNode[] | null): string => {
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

  // Define the default AI settings
  const defaultAiSettings: AiSettings = {
    api_endpoint: null,
    api_key: null,
    selected_model: null,
    prompt_collections: {},
    api_type: "chat",
    summary_prompt: null,
    custom_prompts: null,
  };

  // Function to load AI settings from file
  const loadAiSettings = async (): Promise<AiSettings> => {
    try {
      const settingsPath = `ai_settings.json`;
      const fileContent = await readTextFile(settingsPath);
      const loadedSettings: AiSettings = JSON.parse(fileContent);

      // Merge with default settings to ensure all fields exist
      return { ...defaultAiSettings, ...loadedSettings };
    } catch (error) {
      // Handle file not found or parsing errors by returning default settings
      console.error("Failed to load AI settings, using default:", error);
      return defaultAiSettings;
    }
  };

  // Function to save AI settings to file
  const saveAiSettings = async (settingsToSave: AiSettings): Promise<void> => {
    try {
      const settingsPath = `ai_settings.json`;
      // Ensure the directory exists before writing the file
      // Assume writeFile creates parent directories if they don't exist
      await writeFile(settingsPath, new TextEncoder().encode(JSON.stringify(settingsToSave, null, 2))); // Encode string to Uint8Array
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      // Re-throw the error to be caught by the calling function (handleSaveSettings)
      throw error;
    }
  };
  // Load settings on component mount and handle prompt collections
  useEffect(() => {
    const initializeSettings = async () => {
      const loadedSettings = await loadAiSettings();
      setSettings(loadedSettings);

      // Handle loading prompt collections and selecting the latest version of the first one
      if (loadedSettings.prompt_collections && Object.keys(loadedSettings.prompt_collections).length > 0) {
        const promptNames = Object.keys(loadedSettings.prompt_collections);
        const firstPromptName = promptNames[0];
        const firstPromptCollection = loadedSettings.prompt_collections[firstPromptName];

        if (firstPromptCollection && firstPromptCollection.versions.length > 0) {
          // Assuming versions are sorted by timestamp descending in backend
          const latestVersion = firstPromptCollection.versions[0];
          setCustomPromptsString(formatNodesToLineString([latestVersion.content])); // formatNodesToLineString expects an array
          setSelectedPromptName(firstPromptName);
          setSelectedVersionTimestamp(latestVersion.timestamp);
        } else {
          // Handle case where collection exists but has no versions
          setCustomPromptsString("");
          setSelectedPromptName(firstPromptName);
          setSelectedVersionTimestamp(null);
        }
      } else {
        // Handle case where prompt_collections is empty or null/undefined
        setCustomPromptsString("");
        setSelectedPromptName(null);
        setSelectedVersionTimestamp(null);
      }

      // If customPromptsString is still empty after checking prompt_collections,
      // load from loadedSettings.custom_prompts if available.
      if (
        customPromptsString === "" &&
        loadedSettings.custom_prompts !== null &&
        loadedSettings.custom_prompts !== undefined
      ) {
        setCustomPromptsString(loadedSettings.custom_prompts);
      }
    };

    initializeSettings();
  }, []); // Run only on mount

  // Fetch models when api_endpoint or api_key changes, or on manual refresh
  const fetchModels = async () => {
    if (!settings.api_endpoint) {
      setAvailableModels([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Assuming the API has an endpoint like /models that returns a JSON array of model names
      const modelsUrl = `${settings.api_endpoint}/models`; // Adjust URL as needed
      const models: any = await fetch(modelsUrl, { headers: { Authorization: `Bearer ${settings.api_key}` } }).then(
        (res) => res.json(),
      );
      // Assuming the response is an array of strings or an object with a key containing an array
      if (Array.isArray(models)) {
        setAvailableModels(models.map(String)); // Ensure models are strings
      } else if (models && typeof models === "object" && models.data && Array.isArray(models.data)) {
        // Handle common OpenAI-like response structure
        setAvailableModels(models.data.map((m: any) => m.id).map(String));
      } else {
        setError(t("ai.parseFailure")); // Use translation
        setAvailableModels([]);
      }
    } catch (err) {
      console.error(t("ai.fetchFailure"), err); // Use translation
      setError(`${t("ai.fetchFailure")} ${err}`); // Use translation
      setAvailableModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [settings.api_endpoint, settings.api_key]); // Refetch models when endpoint or key changes

  // Unified input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "custom_prompts_string") {
      // Handle the textarea specifically
      setCustomPromptsString(value);
    } else {
      // Handle other settings fields
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
          title: t("ai.prompts.saveVersionSuccess"),
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
        title: t("ai.prompts.updateVersionSuccess"),
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
      console.error(t("ai.prompts.updateVersionErrorLog"), err);
      await Dialog.show({
        title: t("ai.prompts.updateVersionFailed", { error: String(err) }),
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settingsToSave: AiSettings = {
        api_endpoint: settings.api_endpoint,
        api_key: settings.api_key,
        selected_model: settings.selected_model,
        api_type: settings.api_type,
        summary_prompt: settings.summary_prompt,
        prompt_collections: settings.prompt_collections, // Start with the current collections
        // Assign the custom_prompts string directly.
        // Note: This assumes `custom_prompts` is a separate field, potentially for legacy reasons
        // or for prompts not belonging to a collection. If `prompt_collections` is the sole
        // source of truth, this line and the corresponding field might need removal/adjustment.
        custom_prompts: customPromptsString === "" ? null : customPromptsString,
      };
      console.log("Saving settings:", settingsToSave); // Debug log
      await saveAiSettings(settingsToSave); // Call the frontend save function
      await Dialog.show({
        title: t("ai.saveSuccess"), // Use translation
      });
      // After saving, reload settings to ensure UI is in sync with backend state
      const loadedSettings: AiSettings = await loadAiSettings(); // Use frontend load function
      setSettings(loadedSettings);
      // Re-select the previously selected prompt and version to maintain context
      // This might require finding the updated version in the reloaded settings
      if (
        selectedPromptName &&
        selectedVersionTimestamp !== null &&
        loadedSettings.prompt_collections &&
        loadedSettings.prompt_collections[selectedPromptName]
      ) {
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
      console.error(t("ai.saveFailure"), err); // Use translation
      // Use Dialog for error message instead of alert
      await Dialog.show({ title: t("ai.saveFailure", { error: String(err) }) });
    }
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
        title: t("ai.prompts.promptNameCannotBeEmpty"),
      });
      return;
    }
    if (settings.prompt_collections && settings.prompt_collections[newPromptName.trim()]) {
      await Dialog.show({
        title: t("ai.prompts.promptAlreadyExists", { name: newPromptName.trim() }),
      });
      return;
    }

    try {
      // Create a new empty prompt collection in the backend
      // Note: This calls `save_prompt_version` to create the collection by saving an initial empty version.
      // Ideally, there should be a dedicated backend command like `create_prompt_collection`.
      // This relies on the backend implementation detail.
      await invoke("save_prompt_version", { promptName: newPromptName.trim(), content: { text: "" } });
      // TODO: Consider combining these dialogs or improving feedback
      await Dialog.show({
        title: t("ai.prompts.promptCreatedSuccessfully", { name: newPromptName.trim() }),
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
      console.error(t("ai.prompts.createPromptErrorLog"), err);
      await Dialog.show({
        title: t("ai.prompts.createPromptFailed", { error: String(err) }),
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
            value={settings.api_endpoint || ""}
            onChange={(value) =>
              handleInputChange({ target: { name: "api_endpoint", value } } as React.ChangeEvent<HTMLInputElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </Field>
        <Field title={t("ai.apiConfig.key.title")} description={t("ai.apiConfig.key.description")}>
          {/* Use translation */}
          <Input
            type="password"
            name="api_key"
            value={settings.api_key || ""}
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
            value={settings.api_type || ""}
            onChange={(value) =>
              handleInputChange({ target: { name: "api_type", value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            options={[
              { value: "responses", label: "Responses API" },
              { value: "chat", label: "Chat Completions" },
            ]}
          />
        </Field>
        <Field title={t("ai.apiConfig.model.title")} description={t("ai.apiConfig.model.description")}>
          {" "}
          {/* Use translation */}
          <div className="flex items-center gap-2">
            <Select
              name="selected_model"
              value={settings.selected_model || ""}
              onChange={(value) =>
                handleInputChange({ target: { name: "selected_model", value } } as React.ChangeEvent<HTMLSelectElement>)
              }
              disabled={loading || availableModels.length === 0}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              options={[
                { value: "", label: loading ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select") },
                ...availableModels.map((model) => ({ label: model, value: model })),
              ]}
            />
            <Button
              onClick={fetchModels}
              disabled={loading || !settings.api_endpoint}
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
        <Field title={t("ai.prompts.create.title")} description={t("ai.prompts.create.description")}>
          {" "}
          {/* Use translation */}
          <div className="flex items-center gap-2">
            <Input
              name="new_prompt_name"
              value={newPromptName}
              onChange={setNewPromptName}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder={t("ai.prompts.create.placeholder")}
            />
            <Button
              onClick={handleCreateNewPrompt}
              disabled={!newPromptName.trim()}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" // Use Button component and apply styles
            >
              {t("ai.prompts.create.button")}
            </Button>
          </div>
        </Field>
        {/* Prompt Selection and Version Selection */}
        <div className="flex items-center gap-2">
          <Field
            title={t("ai.prompts.selectCollection.title")}
            description={t("ai.prompts.selectCollection.description")}
          >
            {" "}
            {/* Use translation */}
            <Select
              name="selected_prompt"
              value={selectedPromptName || ""}
              onChange={(value) => handlePromptSelect(value)}
              disabled={!settings.prompt_collections || Object.keys(settings.prompt_collections).length === 0} // Enable if collections exist
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              options={[
                { value: "", label: t("ai.prompts.selectCollection.placeholder") },
                ...(settings.prompt_collections
                  ? Object.keys(settings.prompt_collections).map((name) => ({ label: name, value: name }))
                  : []),
              ]}
            />
          </Field>
          {selectedPromptName &&
            settings.prompt_collections &&
            settings.prompt_collections[selectedPromptName]?.versions.length > 0 && (
              <Field
                title={t("ai.prompts.selectVersion.title")}
                description={t("ai.prompts.selectVersion.description")}
              >
                {" "}
                {/* Use translation */}
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
                            title: t("ai.prompts.confirmDeleteVersion.title"),
                            buttons: [
                              { text: t("common.cancel"), color: "white" }, // Removed value property
                              { text: t("common.confirm"), color: "red" }, // Removed value property
                            ],
                          });
                          // Check the 'value' property instead of hardcoded text
                          if (confirmed.button === t("common.confirm")) {
                            // Check against translated text
                            try {
                              await invoke("delete_prompt_version", {
                                promptName: selectedPromptName,
                                timestamp: selectedVersionTimestamp,
                              });
                              await Dialog.show({
                                title: t("ai.prompts.deleteVersionSuccess"),
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
                              console.error(t("ai.prompts.deleteVersionErrorLog"), err);
                              await Dialog.show({
                                title: t("ai.prompts.deleteVersionFailed", { error: String(err) }),
                              });
                            }
                          }
                        }
                      }}
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" // Use Button component and apply styles
                    >
                      {t("ai.prompts.deleteVersionButton")}
                    </Button>
                  )}
                  {/* Add Save Current Version Button */}
                  {selectedPromptName && selectedVersionTimestamp !== null && customPromptsString.trim() && (
                    <Button
                      onClick={handleUpdateCurrentPromptVersion}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <Save size={14} className="mr-1" />
                      {t("ai.prompts.updateVersionButton")}
                    </Button>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePromptVersion}
                      disabled={!selectedPromptName || !customPromptsString.trim()}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Save size={14} className="mr-1" />
                      {t("ai.prompts.newVersionButton")}
                    </Button>
                  </div>
                </div>
              </Field>
            )}
        </div>
        <Field title={t("ai.prompts.contentEditor.title")} description={t("ai.prompts.contentEditor.description")}>
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
            placeholder={t("ai.prompts.contentEditor.placeholder")}
          />
          <p className="text-panel-text-lighter mt-1 text-xs">{t("ai.prompts.contentEditor.hint")}</p>
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
            placeholder={t("ai.prompts.summaryPrompt.placeholder")}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          className="focus::ring-indigo-500 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <Save size={16} className="mr-2" />
          {t("ai.save")} {/* Use common translation */}
        </Button>
      </div>
    </div>
  );
}
