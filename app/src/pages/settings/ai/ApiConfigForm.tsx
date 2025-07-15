// src\pages\settings\ai\ApiConfigForm.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ApiConfig, McpTool } from "../../../types/aiSettings";
import Input from "../../../components/Input";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { Field, FieldGroup } from "../../../components/Field";
import Slider from "../../../components/Slider";
import Switch from "../../../components/Switch";
import { useTranslation } from "react-i18next";
import { useAiSettingsStore } from "../../../state/aiSettingsStore";

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
  lmstdio: {
    base_url: "http://127.0.0.1:1234",
    api_key: "empty",
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
  const { availableModels, loadingModels, fetchModels } = useAiSettingsStore();

  const getDefaultFormData = useCallback((): FormDataType => {
    let defaults: FormDataType = {
      name: "",
      provider: "openai",
      api_key: "",
      base_url: "",
      model: "",
      temperature: 0.7,
      max_tokens: 2048,
      thinking: { enabled: false, budget_tokens: 4096 },
      notes: "",
      tools: [],
    };
    const initialProvider = config?.provider || defaults.provider;
    if (initialProvider && providerDefaults[initialProvider]) {
      defaults = { ...defaults, ...providerDefaults[initialProvider] };
    }
    if (config?.tools) {
      defaults.tools = config.tools;
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

  useEffect(() => {
    const configForFetching: Partial<ApiConfig> = {
      provider: formData.provider,
      base_url: formData.base_url,
      api_key: formData.api_key,
    };

    if (configForFetching.base_url && configForFetching.api_key) {
      // We need to cast here because formData is partial, but fetchModels expects a full ApiConfig.
      // The fetchModels function primarily needs base_url and api_key.
      fetchModels(configForFetching as ApiConfig);
    }
  }, [formData.provider, formData.base_url, formData.api_key, fetchModels]);

  const handleInputChange = (name: keyof FormDataType, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setManuallyEditedFields((prev) => new Set(prev).add(name));
  };

  const handleThinkingChange = (field: "enabled" | "budget_tokens", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      thinking: {
        ...(prev.thinking || { enabled: false, budget_tokens: 1024 }), // Ensure thinking object exists
        [field]: value,
      },
    }));
    setManuallyEditedFields((prev) => new Set(prev).add("thinking"));
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
      thinkingBudget,
      thinking,
      notes,
      id: formDataId, // Rename to avoid conflict with config.id if used directly
      tools,
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
      thinkingBudget: typeof thinkingBudget === "number" && !isNaN(thinkingBudget) ? thinkingBudget : undefined,
      thinking: thinking,
      notes: notes || undefined,
      tools: tools || [],
    };
    onSave(configToSave);
  };

  const handleAddTool = () => {
    const newTool: McpTool = {
      type: "mcp",
      server_label: "",
      server_url: "",
      require_approval: "never",
    };
    setFormData((prev) => ({
      ...prev,
      tools: [...(prev.tools || []), newTool],
    }));
  };

  const handleRemoveTool = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleToolChange = (index: number, field: keyof McpTool, value: string) => {
    setFormData((prev) => {
      const newTools = [...(prev.tools || [])];
      if (newTools[index]) {
        // @ts-expect-error - We are dynamically assigning a value to a field in the McpTool object.
        newTools[index][field] = value;
      }
      return { ...prev, tools: newTools };
    });
  };

  const providerOptions = [
    { label: "OpenAI", value: "openai" },
    { label: "OpenAI (response)", value: "responses" },
    { label: "Anthropic", value: "claude" },
    { label: "Google Gemini", value: "gemini" },
    { label: "Ollama", value: "ollama" },
    { label: "lmstduio", value: "lmstudio" },
    { label: "Groq", value: "groq" },
    { label: "Local AI (Custom)", value: "local_ai" },
  ];

  const modelOptions = availableModels.map((model) => ({
    label: model.name, // Fallback to id if name is not present
    value: model.id,
  }));

  const handleRefreshModels = () => {
    const configForFetching: Partial<ApiConfig> = {
      provider: formData.provider,
      base_url: formData.base_url,
      api_key: formData.api_key,
    };
    if (configForFetching.base_url && configForFetching.api_key) {
      fetchModels(configForFetching as ApiConfig);
    } else {
      alert(t("ai.form.errorFetchModels", "Please provide Base URL and API Key to fetch models."));
    }
  };

  const showThinkingBudgetControl = useMemo(() => {
    const model = formData.model || "";
    return model.includes("gemini-2.5-pro") || model.includes("gemini-2.5-flash");
  }, [formData.model]);

  const thinkingBudgetConfig = useMemo(() => {
    const model = formData.model || "";
    if (model.includes("gemini-2.5-pro")) {
      return { min: 128, max: 32768, defaultValue: 8192, step: 128 };
    }
    if (model.includes("gemini-2.5-flash")) {
      return { min: 0, max: 24576, defaultValue: 8192, step: 128 };
    }
    return { min: 0, max: 1, defaultValue: 0, step: 1 }; // Fallback
  }, [formData.model]);

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup title={config ? t("ai.form.editTitle") : t("ai.form.addTitle")}>
        {/* Name */}
        <Field title={t("ai.form.name.title")}>
          <Input
            name="name"
            value={formData.name || ""}
            onChange={(value) => handleInputChange("name", value as string)}
            placeholder={t("ai.form.name.placeholder")}
            required
          />
        </Field>

        {/* Provider */}
        <Field title={t("ai.form.provider.title")}>
          <Select
            name="provider"
            value={formData.provider || "openai"}
            onChange={(value) => handleProviderChange(value as string)}
            options={providerOptions}
          />
        </Field>

        {/* API Key */}
        <Field title={t("ai.form.api_key.title")}>
          <Input
            type="password"
            name="api_key"
            value={formData.api_key || ""}
            onChange={(value) => handleInputChange("api_key", value as string)}
            placeholder={t("ai.form.api_key.placeholder")}
            required={formData.provider !== "ollama"}
          />
        </Field>

        {/* Base URL */}
        <Field title={t("ai.form.base_url.title")} description={t("ai.form.base_url.description")}>
          <Input
            name="base_url"
            value={formData.base_url || ""}
            onChange={(value) => handleInputChange("base_url", value as string)}
            placeholder={t("ai.form.base_url.placeholder")}
          />
        </Field>

        {/* Model */}
        <Field
          title={t("ai.form.model.title", "Default Model")}
          description={t("ai.form.model.description", "Suggested for provider, e.g., gpt-4o, llama3")}
        >
          <div className="flex items-center gap-2">
            <Input
              name="model"
              value={formData.model || ""}
              onChange={(value) => handleInputChange("model", value as string)}
              className="flex-grow"
              placeholder={
                loadingModels
                  ? t("ai.form.model.loading", "Loading models...")
                  : t("ai.form.model.selectPlaceholder", "Select or type a model")
              }
              list="model-options"
              disabled={loadingModels}
            />
            <datalist id="model-options">
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
            <Button type="button" variant="outline" onClick={handleRefreshModels} disabled={loadingModels}>
              {loadingModels ? t("common.loading", "Loading...") : t("common.refresh", "Refresh")}
            </Button>
          </div>
        </Field>

        {/* Temperature */}
        <Field title={t("ai.form.temperature.title")} description={t("ai.form.temperature.description")}>
          <Input
            type="number"
            name="temperature"
            value={
              formData.temperature === undefined || formData.temperature === null ? "" : String(formData.temperature)
            }
            onChange={(value) =>
              handleInputChange("temperature", value === "" ? undefined : parseFloat(value as string))
            }
            placeholder={t("ai.form.temperature.placeholder")}
            step="0.1"
            min="0"
            max="2"
          />
        </Field>

        {/* Max Tokens */}
        <Field title={t("ai.form.max_tokens.title")} description={t("ai.form.max_tokens.description")}>
          <Input
            type="number"
            name="max_tokens"
            value={formData.max_tokens === undefined || formData.max_tokens === null ? "" : String(formData.max_tokens)}
            onChange={(value) =>
              handleInputChange("max_tokens", value === "" ? undefined : parseInt(value as string, 10))
            }
            placeholder={t("ai.form.max_tokens.placeholder")}
            step="1"
            min="1"
          />
        </Field>

        {/* Claude Extended Thinking */}
        {formData.provider === "claude" && (
          <>
            <Field
              title={t("ai.form.claude.thinkingEnabled.title", "Enable Extended Thinking")}
              description={t(
                "ai.form.claude.thinkingEnabled.description",
                "Allows Claude to perform extended thinking steps before answering.",
              )}
            >
              <Switch
                value={formData.thinking?.enabled || false}
                onChange={(checked) => handleThinkingChange("enabled", checked)}
              />
            </Field>

            {formData.thinking?.enabled && (
              <Field
                title={t("ai.form.claude.thinkingBudget.title", "Thinking Budget (Tokens)")}
                description={t(
                  "ai.form.claude.thinkingBudget.description",
                  "Tokens reserved for thinking. Must be >= 1024.",
                )}
              >
                <Input
                  type="number"
                  value={String(formData.thinking?.budget_tokens || 1024)}
                  onChange={(value) => {
                    const budget = parseInt(value as string, 10);
                    handleThinkingChange("budget_tokens", isNaN(budget) ? 1024 : budget);
                  }}
                  min="1024"
                  step="1"
                  placeholder="e.g., 2048"
                />
              </Field>
            )}
          </>
        )}

        {/* Gemini Thinking Budget */}
        {showThinkingBudgetControl && (
          <Field
            title={t("ai.form.thinkingBudget.title", "Thinking Budget")}
            description={t("ai.form.thinkingBudget.description", "Adjust the thinking budget for the model.")}
          >
            <div className="flex items-center gap-4">
              <div className="flex-grow">
                <Slider
                  value={formData.thinkingBudget ?? thinkingBudgetConfig.defaultValue}
                  onChange={(value) => handleInputChange("thinkingBudget", value)}
                  min={thinkingBudgetConfig.min}
                  max={thinkingBudgetConfig.max}
                  step={thinkingBudgetConfig.step}
                />
              </div>
            </div>
          </Field>
        )}

        {/* Notes */}
        <Field title={t("ai.form.notes.title")}>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleTextAreaChange}
            placeholder={t("ai.form.notes.placeholder", "Ciallo～(∠・ω< )⌒☆")}
            className="bg-input text-input-default border-input placeholder-input-default focus:border-accent focus:ring-accent block w-full rounded-md p-2 shadow-sm sm:text-sm"
            rows={3}
          />
        </Field>
      </FieldGroup>

      <FieldGroup title={t("ai.form.mcpTools.title", "MCP Tool Configuration")} className="mt-4">
        {formData.tools?.map((tool, index) => (
          <div key={index} className="mb-4 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2">
            <Field title={t("ai.form.mcpTools.serverLabel", "Server Label")}>
              <Input
                value={tool.server_label}
                onChange={(val) => handleToolChange(index, "server_label", val as string)}
                placeholder={t("ai.form.mcpTools.serverLabelPlaceholder", "e.g., My Custom Tool")}
              />
            </Field>
            <Field title={t("ai.form.mcpTools.serverUrl", "Server URL")}>
              <Input
                value={tool.server_url}
                onChange={(val) => handleToolChange(index, "server_url", val as string)}
                placeholder={t("ai.form.mcpTools.serverUrlPlaceholder", "e.g., http://localhost:8000")}
              />
            </Field>
            <Field title={t("ai.form.mcpTools.requireApproval", "Require Approval")}>
              <Select
                value={tool.require_approval}
                onChange={(val) => handleToolChange(index, "require_approval", val as string)}
                options={[
                  { label: t("ai.form.mcpTools.approval.never", "Never"), value: "never" },
                  { label: t("ai.form.mcpTools.approval.always", "Always"), value: "always" },
                ]}
              />
            </Field>
            <div className="flex items-end justify-end md:col-span-2">
              <Button type="button" variant="danger" onClick={() => handleRemoveTool(index)}>
                {t("common.remove", "Remove")}
              </Button>
            </div>
          </div>
        ))}
        <div className="mt-2">
          <Button type="button" variant="outline" onClick={handleAddTool}>
            {t("ai.form.mcpTools.addTool", "Add Tool")}
          </Button>
        </div>
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" onClick={onCancel} variant="outline">
          {t("common.cancel", "Cancel")}
        </Button>
        <Button type="submit" variant="default">
          {t("common.save", "Save")}
        </Button>
      </div>
    </form>
  );
};

export default ApiConfigForm;
