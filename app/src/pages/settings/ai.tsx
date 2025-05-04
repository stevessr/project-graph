import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
// Removed js-yaml, react-simple-code-editor, prismjs imports
import { FieldGroup, Field } from "../../components/Field";
import Button from "../../components/Button";
import { Brain, Download, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import Input from "../../components/Input";
import Select from "../../components/Select";

// Define the structure for a single prompt node
interface PromptNode {
  text: string;
  node_type?: string | null; // Optional type, matches Rust Option<String>
  params?: any | null; // Optional params, matches Rust Option<serde_json::Value>
  children?: PromptNode[] | null; // Optional children, matches Rust Option<Vec<PromptNode>>
}

// Define the structure for AI settings (should match the Rust struct)
interface AiSettings {
  api_endpoint: string | null;
  api_key: string | null;
  selected_model: string | null;
  custom_prompts: PromptNode[] | null; // Updated type
  api_type: string | null;
  summary_prompt?: string | null; // Add field for custom summary prompt
}

export default function AI() {
  const { t } = useTranslation("settings"); // Use the translation hook

  // Update initial state to match the new AiSettings structure
  const [settings, setSettings] = useState<AiSettings>({
    api_endpoint: null,
    api_key: null,
    selected_model: null,
    custom_prompts: null, // Initialize as null, will be loaded
    api_type: "chat", // Set default to "chat"
    summary_prompt: null, // Initialize summary prompt
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPromptsString, setCustomPromptsString] = useState<string>(""); // State for line-based string

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

  // Load settings on component mount and format custom_prompts to string
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings);
        // Format loaded structured prompts to line string for editing
        setCustomPromptsString(formatNodesToLineString(loadedSettings.custom_prompts));
      } catch (err) {
        console.error(t("ai.saveFailure"), err); // Use translation
        setError(`${t("ai.loadFailure")} ${err}`); // Add translation key
      }
    };

    loadSettings();
  }, [t]);

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
      const models: any = await invoke("fetch_ai_models", { url: modelsUrl, apiKey: settings.api_key });
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
  const handleSaveSettings = async () => {
    try {
      // Parse the line format string back into structured data before saving
      const parsedPrompts = parseLineFormat(customPromptsString);

      // Create the settings object to save, including the parsed prompts
      const settingsToSave: AiSettings = {
        ...settings, // Include all existing settings, including summary_prompt
        custom_prompts: parsedPrompts, // Use the newly parsed structure
      };

      await invoke("save_ai_settings", { settings: settingsToSave });
      alert(t("ai.saveSuccess")); // Use translation
    } catch (err) {
      console.error(t("ai.saveFailure"), err); // Use translation
      alert(`${t("ai.saveFailure")} ${err}`); // Use translation
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
            onChange={(value) => handleInputChange({ target: { name: "api_endpoint", value } } as React.ChangeEvent<HTMLInputElement>)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </Field>
        <Field title={t("ai.apiConfig.key.title")} description={t("ai.apiConfig.key.description")}>
          {/* Use translation */}
          <Input
            type="password"
            name="api_key"
            value={settings.api_key || ""}
            onChange={(value) => handleInputChange({ target: { name: "api_key", value } } as React.ChangeEvent<HTMLInputElement>)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </Field>
        {/* Add API Type Selection Field */}
        <Field title={t("ai.apiConfig.apiType.title")} description={t("ai.apiConfig.apiType.description")}>
          <Select
            name="api_type"
            value={settings.api_type || ""}
            onChange={(value) => handleInputChange({ target: { name: "api_type", value } } as React.ChangeEvent<HTMLSelectElement>)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            options={[
              { value: "responses", label: "Responses API" },
              { value: "chat", label: "Chat Completions" }
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
              onChange={(value) => handleInputChange({ target: { name: "selected_model", value } } as React.ChangeEvent<HTMLSelectElement>)}
              disabled={loading || availableModels.length === 0}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              options={[
                { value: "", label: loading ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select") },
                ...availableModels.map(model => ({ label: model, value: model }))
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
      <FieldGroup title={t("ai.prompts.title")}>
        {" "}
        {/* Use translation */}
        <Field title={t("ai.prompts.systemPrompt.title")} description={t("ai.prompts.systemPrompt.description")}>
          {" "}
          {/* Use translation */}
          {/* Reverted back to textarea */}
          <Input
            multiline
            name="custom_prompts_string" // Use new name for handler
            rows={10}
            value={customPromptsString} // Bind to string state
            onChange={(value) => handleInputChange({ target: { name: "custom_prompts_string", value } } as React.ChangeEvent<HTMLTextAreaElement>)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={t("ai.prompts.lineFormatPlaceholder")} // Add new translation key
          />
          <p className="text-panel-text-lighter mt-1 text-xs">
            {t("ai.prompts.lineFormatHint")} {/* Add new translation key */}
          </p>
        </Field>
        {/* Add Field for Custom Summary Prompt */}
        <Field title={t("ai.prompts.summaryPrompt.title")} description={t("ai.prompts.summaryPrompt.description")}>
          <Input
            multiline
            name="summary_prompt" // Name matches the state key
            rows={3} // Adjust rows as needed
            value={settings.summary_prompt || ""} // Bind to state
            onChange={(value) => handleInputChange({ target: { name: "summary_prompt", value } } as React.ChangeEvent<HTMLTextAreaElement>)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={t("ai.prompts.summaryPrompt.placeholder")} // Add placeholder translation key
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Save size={16} className="mr-2" />
          {t("ai.save")} {/* Use translation */}
        </Button>
      </div>
    </div>
  );
}
