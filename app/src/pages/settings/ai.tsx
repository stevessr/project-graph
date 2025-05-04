import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FieldGroup, Field } from "../../components/Field";
import Button from "../../components/Button";
import { Brain, Download, Save } from "lucide-react";
import { useTranslation } from "react-i18next"; // Import useTranslation

// Define the structure for AI settings (should match the Rust struct)
interface AiSettings {
  api_endpoint: string | null;
  api_key: string | null;
  selected_model: string | null;
  custom_prompts: string | null;
}

export default function AI() {
  const { t } = useTranslation("settings"); // Use the translation hook

  const [settings, setSettings] = useState<AiSettings>({
    api_endpoint: null,
    api_key: null,
    selected_model: null,
    custom_prompts: null,
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings: AiSettings = await invoke("load_ai_settings");
        setSettings(loadedSettings);
      } catch (err) {
        console.error(t("ai.saveFailure"), err); // Use translation
        // Optionally set an error state for the user
      }
    };

    loadSettings();
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value === "" ? null : value, // Store empty strings as null
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await invoke("save_ai_settings", { settings });
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
          {" "}
          {/* Use translation */}
          <input
            type="text"
            name="api_endpoint"
            className="text-panel-text bg-field-group-bg mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" // Apply styles
            value={settings.api_endpoint || ""}
            onChange={handleInputChange}
          />
        </Field>
        <Field title={t("ai.apiConfig.key.title")} description={t("ai.apiConfig.key.description")}>
          {" "}
          {/* Use translation */}
          <input
            type="password"
            name="api_key"
            className="text-panel-text bg-field-group-bg mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" // Apply styles
            value={settings.api_key || ""}
            onChange={handleInputChange}
          />
        </Field>
        <Field title={t("ai.apiConfig.model.title")} description={t("ai.apiConfig.model.description")}>
          {" "}
          {/* Use translation */}
          <div className="flex items-center gap-2">
            <select
              name="selected_model"
              className="text-panel-text bg-field-group-bg mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" // Apply styles
              value={settings.selected_model || ""}
              onChange={handleInputChange}
              disabled={loading || availableModels.length === 0}
            >
              <option value="">{loading ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select")}</option>{" "}
              {/* Use translation */}
              {availableModels.map((model: string) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
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
          <textarea
            name="custom_prompts"
            rows={5}
            className="text-panel-text bg-field-group-bg mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" // Apply styles
            value={settings.custom_prompts || ""}
            onChange={handleInputChange}
          ></textarea>
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
