import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// Define the structure for AI settings (should match the Rust struct)
interface AiSettings {
  api_endpoint: string | null;
  api_key: string | null;
  selected_model: string | null;
  custom_prompts: string | null;
}

export default function AI() {
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
        console.error("Failed to load AI settings:", err);
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
        setError("Failed to parse models from API response.");
        setAvailableModels([]);
      }
    } catch (err) {
      console.error("Failed to fetch AI models:", err);
      setError(`Failed to fetch models: ${err}`);
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
    setSettings((prevSettings: AiSettings) => ({
      ...prevSettings,
      [name]: value === "" ? null : value, // Store empty strings as null
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await invoke("save_ai_settings", { settings });
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save AI settings:", err);
      alert(`Failed to save settings: ${err}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">AI Settings</h1>

      {error && <div className="mb-4 text-red-500">{error}</div>}

      <div className="mb-4">
        <label htmlFor="api_endpoint" className="block text-sm font-medium text-gray-700">
          API Endpoint
        </label>
        <input
          type="text"
          name="api_endpoint"
          id="api_endpoint"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={settings.api_endpoint || ""}
          onChange={handleInputChange}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="api_key" className="block text-sm font-medium text-gray-700">
          API Key
        </label>
        <input
          type="password" // Use password type for sensitive key
          name="api_key"
          id="api_key"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={settings.api_key || ""}
          onChange={handleInputChange}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="selected_model" className="block text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          name="selected_model"
          id="selected_model"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={settings.selected_model || ""}
          onChange={handleInputChange}
          disabled={loading || availableModels.length === 0}
        >
          <option value="">{loading ? "Loading models..." : "Select a model"}</option>
          {availableModels.map((model: string) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <button
          onClick={fetchModels}
          disabled={loading || !settings.api_endpoint}
          className="mt-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {loading ? "Refreshing..." : "Refresh Models"}
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="custom_prompts" className="block text-sm font-medium text-gray-700">
          Custom Prompts
        </label>
        <textarea
          name="custom_prompts"
          id="custom_prompts"
          rows={5}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={settings.custom_prompts || ""}
          onChange={handleInputChange}
        ></textarea>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
