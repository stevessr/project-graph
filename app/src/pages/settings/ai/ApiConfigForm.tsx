// src\pages\settings\ai\ApiConfigForm.tsx
import React, { useEffect, useState, useCallback } from "react";
import { ApiConfig } from "../../../types/aiSettings";
import Input from "../../../components/Input";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { Field, FieldGroup } from "../../../components/Field";
import { useTranslation } from "react-i18next";

interface ApiConfigFormProps {
  config?: ApiConfig; // Changed from ApiConfig | null
  onSave: (config: ApiConfig) => void;
  onCancel: () => void;
}

type FormDataType = Partial<Omit<ApiConfig, "id">> & { id?: string };

// Define default settings for each provider
const providerDefaults: Record<string, Partial<ApiConfig>> = {
  openai: {
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  anthropic: {
    base_url: "https://api.anthropic.com/v1",
    model: "claude-3-opus-20240229",
  },
  "google-gemini": {
    // Matched the key from your Rust defaults
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-1.5-pro-latest",
  },
  ollama: {
    // Matched the key from your Rust defaults
    base_url: "http://localhost:11434/v1",
    model: "llama3",
    api_key: "ollama", // Ollama often uses a placeholder or no key
  },
  groq: {
    base_url: "https://api.groq.com/openai/v1",
    model: "llama3-8b-8192",
  },
  local_ai: {
    base_url: "http://localhost:8080/v1", // Example, user should confirm
    model: "", // User needs to specify
    api_key: "local-ai-key", // Often a placeholder
  },
};

const ApiConfigForm: React.FC<ApiConfigFormProps> = ({ config, onSave, onCancel }) => {
  const { t } = useTranslation("settings");

  const getDefaultFormData = useCallback((): FormDataType => {
    let defaults: FormDataType = {
      name: "",
      provider: "openai",
      api_key: "",
      base_url: "",
      model: "",
      temperature: 0.7,
      max_tokens: 2048,
      notes: "",
    };
    const initialProvider = config?.provider || defaults.provider;
    if (initialProvider && providerDefaults[initialProvider]) {
      defaults = { ...defaults, ...providerDefaults[initialProvider] };
    }
    return defaults;
  }, [config]);

  const [formData, setFormData] = useState<FormDataType>(getDefaultFormData());
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<keyof FormDataType>>(new Set());

  useEffect(() => {
    if (config) {
      const newFormData: FormDataType = { ...getDefaultFormData(), ...config };
      setFormData(newFormData);
      const initiallySetFields = new Set<keyof FormDataType>(Object.keys(config) as Array<keyof FormDataType>);
      setManuallyEditedFields(initiallySetFields);
    } else {
      const initialDefaults = getDefaultFormData();
      const initialProvider = initialDefaults.provider!;
      const providerSpecific = providerDefaults[initialProvider] || {};
      setFormData({ ...initialDefaults, ...providerSpecific });
      setManuallyEditedFields(new Set());
    }
  }, [config, getDefaultFormData]);

  const handleInputChange = (name: keyof FormDataType, value: string | number | undefined | null) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setManuallyEditedFields((prev) => new Set(prev).add(name));
  };

  const handleProviderChange = (newProvider: string) => {
    const currentProviderDefaults = providerDefaults[newProvider] || {};

    setFormData((prev) => {
      const updatedFormData = { ...prev, provider: newProvider };
      if (currentProviderDefaults.base_url && !manuallyEditedFields.has("base_url")) {
        updatedFormData.base_url = currentProviderDefaults.base_url;
      }
      if (currentProviderDefaults.model && !manuallyEditedFields.has("model")) {
        updatedFormData.model = currentProviderDefaults.model;
      }
      if (newProvider === "ollama" && (!prev.api_key || providerDefaults[prev.provider!]?.api_key === prev.api_key)) {
        if (!manuallyEditedFields.has("api_key") || prev.api_key === "") {
          updatedFormData.api_key = currentProviderDefaults.api_key;
        }
      } else if (
        prev.provider === "ollama" &&
        newProvider !== "ollama" &&
        prev.api_key === providerDefaults.ollama.api_key
      ) {
        if (!manuallyEditedFields.has("api_key")) {
          updatedFormData.api_key = "";
        }
      }
      return updatedFormData;
    });
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target as { name: keyof FormDataType; value: string };
    handleInputChange(name, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Destructure all relevant fields from formData
    const {
      name,
      provider,
      api_key,
      base_url,
      model,
      temperature,
      max_tokens,
      notes,
      id: formDataId, // Rename to avoid conflict with config.id if used directly
    } = formData;

    if (!name || !provider || !api_key) {
      alert(t("ai.form.errorRequiredFields", "Name, Provider, and API Key are required."));
      return;
    }

    // At this point, name, provider, and api_key are guaranteed to be non-empty strings.
    // TypeScript's control flow analysis should recognize this.
    const configToSave: ApiConfig = {
      id: config?.id || formDataId || crypto.randomUUID(),
      name: name as string, // Assert as string
      provider: provider as string, // Assert as string
      api_key: api_key as string, // Assert as string
      base_url: base_url || "",
      model: model || "",
      temperature: typeof temperature === "number" && !isNaN(temperature) ? temperature : undefined,
      max_tokens: typeof max_tokens === "number" && !isNaN(max_tokens) ? max_tokens : undefined,
      notes: notes || undefined,
    };
    onSave(configToSave);
  };

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
        <Field title={t("ai.form.api_key.title", "API Key")}>
          <Input
            type="password"
            name="api_key"
            value={formData.api_key || ""}
            onChange={(value) => handleInputChange("api_key", value as string)}
            placeholder={t("ai.form.api_key.placeholder", "Enter your API key")}
            required={formData.provider !== "ollama"}
          />
        </Field>

        {/* Base URL */}
        <Field
          title={t("ai.form.base_url.title", "Base URL")}
          description={t("ai.form.base_url.description", "Automatically suggested for selected provider.")}
        >
          <Input
            name="base_url"
            value={formData.base_url || ""}
            onChange={(value) => handleInputChange("base_url", value as string)}
            placeholder={t("ai.form.base_url.placeholder", "e.g., https://api.example.com/v1")}
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
          title={t("ai.form.max_tokens.title", "Max Tokens")}
          description={t("ai.form.max_tokens.description", "Optional: Max tokens in response.")}
        >
          <Input
            type="number"
            name="max_tokens"
            value={formData.max_tokens === undefined || formData.max_tokens === null ? "" : String(formData.max_tokens)}
            onChange={(value) =>
              handleInputChange("max_tokens", value === "" ? undefined : parseInt(value as string, 10))
            }
            placeholder={t("ai.form.max_tokens.placeholder", "e.g., 2048")}
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
            className="bg-input text-input-default border-input placeholder-input-default focus:border-accent focus:ring-accent block w-full rounded-md p-2 shadow-sm sm:text-sm"
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
