import React, { useEffect, useState, useCallback } from "react";
import { ApiConfig } from "../../../types/aiSettings";
import Input from "../../../components/Input";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { Field, FieldGroup } from "../../../components/Field";
import { useTranslation } from "react-i18next";

interface ApiConfigFormProps {
  config?: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
  onCancel: () => void;
}

type FormDataType = Partial<Omit<ApiConfig, "id">> & { id?: string };

// Define default settings for each provider
const providerDefaults: Record<string, Partial<ApiConfig>> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-opus-20240229",
  },
  "google-gemini": {
    // Matched the key from your Rust defaults
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-1.5-pro-latest",
  },
  ollama: {
    // Matched the key from your Rust defaults
    baseUrl: "http://localhost:11434/v1",
    model: "llama3",
    apiKey: "ollama", // Ollama often uses a placeholder or no key
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama3-8b-8192",
  },
  // For "local_ai", it's harder to give a universal default baseUrl.
  // Users typically configure this. We can leave it blank or suggest a common one.
  local_ai: {
    // This was an option in your original dropdown
    baseUrl: "http://localhost:8080/v1", // Example, user should confirm
    model: "", // User needs to specify
    apiKey: "local-ai-key", // Often a placeholder
  },
};

const ApiConfigForm: React.FC<ApiConfigFormProps> = ({ config, onSave, onCancel }) => {
  const { t } = useTranslation("settings");

  const getDefaultFormData = useCallback((): FormDataType => {
    // Start with global defaults
    let defaults: FormDataType = {
      name: "",
      provider: "openai", // Default provider for a new form
      apiKey: "",
      baseUrl: "",
      model: "",
      temperature: 0.7,
      maxTokens: 2048,
      notes: "",
    };
    // Apply provider-specific defaults if a provider is set
    const initialProvider = config?.provider || defaults.provider;
    if (initialProvider && providerDefaults[initialProvider]) {
      defaults = { ...defaults, ...providerDefaults[initialProvider] };
    }
    return defaults;
  }, [config]); // Include config in dependencies if it influences initial provider choice for defaults

  const [formData, setFormData] = useState<FormDataType>(getDefaultFormData());
  // Keep track of whether the user has manually edited a field for the current provider
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<keyof FormDataType>>(new Set());

  useEffect(() => {
    if (config) {
      const newFormData: FormDataType = { ...getDefaultFormData(), ...config };
      setFormData(newFormData);
      // When loading an existing config, assume all its fields were "manually set" or intentional.
      const initiallySetFields = new Set<keyof FormDataType>(Object.keys(config) as Array<keyof FormDataType>);
      setManuallyEditedFields(initiallySetFields);
    } else {
      // For a new form, apply defaults for the initial provider
      const initialDefaults = getDefaultFormData();
      const initialProvider = initialDefaults.provider!;
      const providerSpecific = providerDefaults[initialProvider] || {};
      setFormData({ ...initialDefaults, ...providerSpecific });
      setManuallyEditedFields(new Set()); // Reset for new form
    }
  }, [config, getDefaultFormData]);

  const handleInputChange = (name: keyof FormDataType, value: string | number | undefined | null) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setManuallyEditedFields((prev) => new Set(prev).add(name)); // Mark as manually edited
  };

  const handleProviderChange = (newProvider: string) => {
    const currentProviderDefaults = providerDefaults[newProvider] || {};

    setFormData((prev) => {
      const updatedFormData = { ...prev, provider: newProvider };
      // Apply defaults for the new provider ONLY if the fields weren't manually set for this provider yet
      // or if the field is typically provider-dependent (like baseUrl, model).
      // For simplicity here, if not manually edited, we apply the new provider's default.
      // A more complex logic could remember "manually edited per provider".

      if (currentProviderDefaults.baseUrl && !manuallyEditedFields.has("baseUrl")) {
        updatedFormData.baseUrl = currentProviderDefaults.baseUrl;
      }
      if (currentProviderDefaults.model && !manuallyEditedFields.has("model")) {
        updatedFormData.model = currentProviderDefaults.model;
      }
      // For apiKey, it's tricky. Ollama has a default, others need user input.
      // If switching TO ollama and apiKey is empty or was a default from another, set ollama's default.
      if (newProvider === "ollama" && (!prev.apiKey || providerDefaults[prev.provider!]?.apiKey === prev.apiKey)) {
        if (!manuallyEditedFields.has("apiKey") || prev.apiKey === "") {
          updatedFormData.apiKey = currentProviderDefaults.apiKey;
        }
      } else if (
        prev.provider === "ollama" &&
        newProvider !== "ollama" &&
        prev.apiKey === providerDefaults.ollama.apiKey
      ) {
        // If switching FROM ollama and apiKey was ollama's default, clear it unless manually changed.
        if (!manuallyEditedFields.has("apiKey")) {
          updatedFormData.apiKey = "";
        }
      }
      return updatedFormData;
    });
    // Reset 'manuallyEdited' for baseUrl and model when provider changes,
    // so defaults can apply unless user edits them *after* provider switch.
    // Or, better, clear them only if we are applying a default.
    // For now, let's assume the above logic is sufficient. If a field gets a default,
    // and the user then edits it, `manuallyEditedFields` will capture that.
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target as { name: keyof FormDataType; value: string };
    handleInputChange(name, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.provider || !formData.apiKey) {
      alert(t("ai.form.errorRequiredFields", "Name, Provider, and API Key are required."));
      return;
    }

    const configToSave: ApiConfig = {
      id: config?.id || formData.id || crypto.randomUUID(),
      name: formData.name!,
      provider: formData.provider!,
      apiKey: formData.apiKey!,
      baseUrl: formData.baseUrl || undefined,
      model: formData.model || undefined,
      temperature:
        typeof formData.temperature === "number" && !isNaN(formData.temperature) ? formData.temperature : undefined,
      maxTokens: typeof formData.maxTokens === "number" && !isNaN(formData.maxTokens) ? formData.maxTokens : undefined,
      notes: formData.notes || undefined,
    };
    onSave(configToSave);
  };

  // Match provider keys with providerDefaults and Rust defaults
  const providerOptions = [
    { label: "OpenAI", value: "openai" },
    { label: "Anthropic", value: "anthropic" },
    { label: "Google Gemini", value: "google-gemini" },
    { label: "Ollama", value: "ollama" },
    { label: "Groq", value: "groq" },
    { label: "Local AI (Custom)", value: "local_ai" },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup
        title={config ? t("ai.form.editTitle", "Edit AI Configuration") : t("ai.form.addTitle", "Add AI Configuration")}
      >
        {/* Name */}
        <Field title={t("ai.form.name.title", "Configuration Name")}>
          <Input
            name="name"
            value={formData.name || ""}
            onChange={(value) => handleInputChange("name", value as string)}
            placeholder={t("ai.form.name.placeholder", "e.g., My OpenAI Key")}
            required
          />
        </Field>

        {/* Provider */}
        <Field title={t("ai.form.provider.title", "Provider")}>
          <Select
            name="provider"
            value={formData.provider || "openai"}
            onChange={(value) => handleProviderChange(value as string)}
            options={providerOptions}
          />
        </Field>

        {/* API Key */}
        <Field title={t("ai.form.apiKey.title", "API Key")}>
          <Input
            type="password"
            name="apiKey"
            value={formData.apiKey || ""}
            onChange={(value) => handleInputChange("apiKey", value as string)}
            placeholder={t("ai.form.apiKey.placeholder", "Enter your API key")}
            required={formData.provider !== "ollama"} // API key might not be strictly required for Ollama if it's open
          />
        </Field>

        {/* Base URL */}
        <Field
          title={t("ai.form.baseUrl.title", "Base URL")}
          description={t("ai.form.baseUrl.description", "Automatically suggested for selected provider.")}
        >
          <Input
            name="baseUrl"
            value={formData.baseUrl || ""}
            onChange={(value) => handleInputChange("baseUrl", value as string)}
            placeholder={t("ai.form.baseUrl.placeholder", "e.g., https://api.example.com/v1")}
          />
        </Field>

        {/* Model */}
        <Field
          title={t("ai.form.model.title", "Default Model")}
          description={t("ai.form.model.description", "Suggested for provider, e.g., gpt-4o, llama3")}
        >
          <Input
            name="model"
            value={formData.model || ""}
            onChange={(value) => handleInputChange("model", value as string)}
            placeholder={t("ai.form.model.placeholder", "e.g., gpt-3.5-turbo")}
          />
        </Field>

        {/* Temperature */}
        <Field
          title={t("ai.form.temperature.title", "Temperature")}
          description={t("ai.form.temperature.description", "Optional: Controls randomness (0-2).")}
        >
          <Input
            type="number"
            name="temperature"
            value={
              formData.temperature === undefined || formData.temperature === null ? "" : String(formData.temperature)
            }
            onChange={(value) =>
              handleInputChange("temperature", value === "" ? undefined : parseFloat(value as string))
            }
            placeholder={t("ai.form.temperature.placeholder", "e.g., 0.7")}
            step="0.1"
            min="0"
            max="2"
          />
        </Field>

        {/* Max Tokens */}
        <Field
          title={t("ai.form.maxTokens.title", "Max Tokens")}
          description={t("ai.form.maxTokens.description", "Optional: Max tokens in response.")}
        >
          <Input
            type="number"
            name="maxTokens"
            value={formData.maxTokens === undefined || formData.maxTokens === null ? "" : String(formData.maxTokens)}
            onChange={(value) =>
              handleInputChange("maxTokens", value === "" ? undefined : parseInt(value as string, 10))
            }
            placeholder={t("ai.form.maxTokens.placeholder", "e.g., 2048")}
            step="1"
            min="1"
          />
        </Field>

        {/* Notes */}
        <Field title={t("ai.form.notes.title", "Notes")}>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleTextAreaChange}
            placeholder={t("ai.form.notes.placeholder", "Optional notes about this configuration.")}
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </Field>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" onClick={onCancel} variant="outline">
            {t("common.cancel", "Cancel")}
          </Button>
          <Button type="submit" variant="default">
            {t("common.save", "Save")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};

export default ApiConfigForm;
