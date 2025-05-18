// src\pages\settings\ai\ApiConfigSection.tsx
import React from "react";
import { FieldGroup, Field } from "../../../components/Field";
import Input from "../../../components/Input"; // Assuming onChange: (value: string, name?: string) => void or (value: string) => void
import Select from "../../../components/Select"; // Assuming onChange: (value: string | number, name?: string) => void or (value: string | number) => void
import Button from "../../../components/Button";
import { Brain, Download, RefreshCw } from "lucide-react"; // Added RefreshCw
import { ApiConfig } from "../../../types/aiSettings";
import { TFunction } from "i18next";

interface ApiConfigSectionProps {
  activeApiConfig: ApiConfig | null; // The currently selected/active API configuration
  availableModels: string[]; // List of models fetched for the active config
  loadingModels: boolean; // True if models are being fetched
  // Callback from parent to update the activeApiConfig based on input changes.
  // It expects a ChangeEvent-like object.
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onFetchModels: () => Promise<void>; // Action to trigger fetching models
  t: TFunction<"settings", undefined>; // Translation function
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  activeApiConfig,
  availableModels,
  loadingModels,
  onInputChange,
  onFetchModels,
  t,
}) => {
  // Helper to simulate a ChangeEvent for the parent's onInputChange handler,
  // as our custom Input/Select components likely provide simpler onChange callbacks.
  const createChangeEvent = (
    name: string,
    value: string | number,
  ): React.ChangeEvent<HTMLInputElement | HTMLSelectElement> => {
    return {
      target: { name, value: String(value) }, // Ensure target.value is always a string
    } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
  };

  const canFetchModels =
    activeApiConfig?.provider && // Provider must be selected
    activeApiConfig?.apiKey && // API key is almost always needed
    // For OpenAI/LocalAI/Ollama provider types, baseUrl is usually required or configurable
    (activeApiConfig.provider === "openai" ||
    activeApiConfig.provider === "local_ai" ||
    activeApiConfig.provider === "ollama"
      ? !!activeApiConfig.baseUrl // Base URL needed for these if not using OpenAI's default
      : activeApiConfig.provider === "anthropic" ||
          activeApiConfig.provider === "gemini" ||
          activeApiConfig.provider === "groq"
        ? true // These often have fixed base URLs managed by SDKs or don't need one user-set for model listing
        : true); // Default assumption for other providers, may need refinement

  const providerOptions = [
    { label: t("ai.apiConfig.provider.options.select", "Select a provider"), value: "", disabled: true },
    { label: "OpenAI", value: "openai" },
    { label: "responses API", value: "responses", disabled: true },
    { label: "Anthropic", value: "anthropic" },
    { label: "Google Gemini", value: "gemini" },
    { label: "Local AI (OpenAI-Compatible)", value: "local_ai" },
    { label: "Ollama", value: "ollama" },
    { label: "Groq", value: "groq" },
    // Consider adding Azure OpenAI if it becomes common, note its specific config needs
  ];

  const inputClassName =
    "block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <FieldGroup title={t("ai.apiConfig.title", "API Configuration Details")} icon={<Brain size={20} />}>
      {/* Configuration Name Field */}
      <Field
        title={t("ai.apiConfig.name.title", "Configuration Name")}
        description={t("ai.apiConfig.name.description", "A unique name for this API configuration.")}
      >
        <Input
          name="name"
          value={activeApiConfig?.name || ""}
          onChange={(value) => onInputChange(createChangeEvent("name", value))}
          placeholder={t("ai.apiConfig.name.placeholder", "e.g., My OpenAI Key")}
          className={inputClassName}
        />
      </Field>

      {/* Provider Selection Field */}
      <Field
        title={t("ai.apiConfig.provider.title", "Provider")}
        description={t("ai.apiConfig.provider.description", "Select the AI service provider.")}
      >
        <Select
          name="provider"
          value={activeApiConfig?.provider || ""}
          onChange={(value) => onInputChange(createChangeEvent("provider", String(value)))}
          className={inputClassName}
          options={providerOptions}
        />
      </Field>

      {/* Base URL Field */}
      <Field
        title={t("ai.apiConfig.baseUrl.title", "Base URL")}
        description={t(
          "ai.apiConfig.baseUrl.description",
          "Optional: Custom API endpoint. Often required for 'Local AI', 'Ollama', or proxies. For OpenAI, default is used if empty.",
        )}
      >
        <Input
          name="baseUrl"
          value={activeApiConfig?.baseUrl || ""}
          onChange={(value) => onInputChange(createChangeEvent("baseUrl", value))}
          placeholder={t(
            "ai.apiConfig.baseUrl.placeholder",
            "e.g., http://localhost:11434/v1 (Ollama) or http://localhost:1234/v1 (LocalAI)",
          )}
          className={inputClassName}
        />
      </Field>

      {/* API Key Field */}
      <Field
        title={t("ai.apiConfig.key.title", "API Key")}
        description={t(
          "ai.apiConfig.key.description",
          "Your secret API key for the selected provider. May not be required for all local providers (e.g. Ollama).",
        )}
      >
        <Input
          type="password"
          name="apiKey"
          value={activeApiConfig?.apiKey || ""}
          onChange={(value) => onInputChange(createChangeEvent("apiKey", value))}
          placeholder={t("ai.apiConfig.key.placeholder", "Enter your API key (if required)")}
          className={inputClassName}
        />
      </Field>

      {/* Model Selection Field */}
      <Field
        title={t("ai.apiConfig.model.title", "Default Model")}
        description={t(
          "ai.apiConfig.model.description",
          "Select a default model. Refresh list if Provider, Base URL, or API Key changes.",
        )}
      >
        <div className="flex items-center gap-2">
          <Select
            name="model"
            value={activeApiConfig?.model || ""}
            onChange={(value) => onInputChange(createChangeEvent("model", String(value)))}
            disabled={loadingModels || (availableModels.length === 0 && !activeApiConfig?.provider)}
            className={`ai-model-select ${inputClassName}`}
            options={[
              {
                value: "",
                label: loadingModels
                  ? t("ai.apiConfig.model.loading", "Loading models...")
                  : availableModels.length === 0 && activeApiConfig?.provider
                    ? t("ai.apiConfig.model.noModelsFetch", "No models found (Refresh?)")
                    : t("ai.apiConfig.model.select", "Select a model"),
              },
              ...availableModels.map((modelName) => ({
                label: modelName,
                value: modelName,
              })),
            ]}
          />
          <Button
            onClick={onFetchModels}
            disabled={loadingModels || !canFetchModels}
            variant="outline"
            title={t("ai.apiConfig.model.refreshTitle", "Refresh model list")}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            {loadingModels ? (
              <>
                <RefreshCw size={16} className="mr-1.5 animate-spin" />
                {t("ai.apiConfig.model.refreshing", "Refreshing...")}
              </>
            ) : (
              <Download size={16} />
            )}
          </Button>
        </div>
        {availableModels.length === 0 && !loadingModels && activeApiConfig?.provider && canFetchModels && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(
              "ai.apiConfig.model.noModelsHint",
              "No models found. Ensure Provider, API Key, and Base URL (if applicable) are correct, then refresh.",
            )}
          </p>
        )}
        {availableModels.length === 0 && !loadingModels && activeApiConfig?.provider && !canFetchModels && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(
              "ai.apiConfig.model.fetchDisabledHint",
              "Select Provider, and enter API Key (and Base URL if needed) to fetch models.",
            )}
          </p>
        )}
      </Field>

      {/* Temperature Field */}
      <Field
        title={t("ai.apiConfig.temperature.title", "Default Temperature")}
        description={t(
          "ai.apiConfig.temperature.description",
          "Controls randomness. Lower is more deterministic. E.g., 0.0 to 2.0. Leave empty for provider default.",
        )}
      >
        <Input
          type="number"
          name="temperature"
          value={
            activeApiConfig?.temperature === undefined || activeApiConfig?.temperature === null
              ? ""
              : String(activeApiConfig.temperature)
          }
          onChange={(value) => onInputChange(createChangeEvent("temperature", value))}
          placeholder={t("ai.apiConfig.temperature.placeholder", "e.g., 0.7")}
          className={inputClassName}
          step="0.1"
          min="0"
          max="2"
        />
      </Field>

      {/* Max Tokens Field */}
      <Field
        title={t("ai.apiConfig.maxTokens.title", "Default Max Tokens")}
        description={t(
          "ai.apiConfig.maxTokens.description",
          "Maximum number of tokens to generate. Leave empty for provider default.",
        )}
      >
        <Input
          type="number"
          name="maxTokens"
          value={
            activeApiConfig?.maxTokens === undefined || activeApiConfig?.maxTokens === null
              ? ""
              : String(activeApiConfig.maxTokens)
          }
          onChange={(value) => onInputChange(createChangeEvent("maxTokens", value))}
          placeholder={t("ai.apiConfig.maxTokens.placeholder", "e.g., 2048")}
          className={inputClassName}
          step="1"
          min="1"
        />
      </Field>

      {/* Notes Field */}
      <Field
        title={t("ai.apiConfig.notes.title", "Notes")}
        description={t("ai.apiConfig.notes.description", "Optional: Any notes about this configuration.")}
      >
        <Input
          name="notes"
          value={activeApiConfig?.notes || ""}
          onChange={(value) => onInputChange(createChangeEvent("notes", value))}
          placeholder={t("ai.apiConfig.notes.placeholder", "e.g., For testing new models")}
          className={inputClassName}
        />
      </Field>

      {/*
        This section handles parameters specific to an active API configuration.
        The overall `ApiConfig` object (including `id`) is assumed
        to be managed by a parent component (e.g., the `ApiConfigForm` that might use this section).
      */}
    </FieldGroup>
  );
};
