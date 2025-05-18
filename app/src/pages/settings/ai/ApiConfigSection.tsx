import React from "react";
import { FieldGroup, Field } from "../../../components/Field";
import Input from "../../../components/Input";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { Brain, Download } from "lucide-react";
import { ApiConfig } from "../../../types/aiSettings";
import { TFunction } from "i18next";

interface ApiConfigSectionProps {
  activeApiConfig: ApiConfig | null;
  availableModels: string[];
  loadingModels: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onFetchModels: () => Promise<void>;
  t: TFunction<"settings", undefined>;
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  activeApiConfig,
  availableModels,
  loadingModels,
  onInputChange,
  onFetchModels,
  t,
}) => {
  return (
    <FieldGroup title={t("ai.apiConfig.title")} icon={<Brain />}>
      <Field title={t("ai.apiConfig.endpoint.title")} description={t("ai.apiConfig.endpoint.description")}>
        <Input
          name="endpoint_url"
          value={activeApiConfig?.endpoint_url || ""}
          onChange={(value) =>
            onInputChange({ target: { name: "endpoint_url", value } } as React.ChangeEvent<HTMLInputElement>)
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </Field>
      <Field title={t("ai.apiConfig.key.title")} description={t("ai.apiConfig.key.description")}>
        <Input
          type="password"
          name="api_key"
          value={activeApiConfig?.api_key || ""}
          onChange={(value) =>
            onInputChange({ target: { name: "api_key", value } } as React.ChangeEvent<HTMLInputElement>)
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </Field>
      <Field title={t("ai.apiConfig.apiType.title")} description={t("ai.apiConfig.apiType.description")}>
        <Select
          name="api_type"
          value={activeApiConfig?.api_type || ""}
          onChange={(value) =>
            onInputChange({ target: { name: "api_type", value } } as React.ChangeEvent<HTMLSelectElement>)
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          options={[
            { value: "responses", label: "Responses API", disabled: true },
            { value: "chat", label: "Chat Completions" },
            { value: "gemini", label: "Gemini", disabled: true },
          ]}
        />
      </Field>
      <Field title={t("ai.apiConfig.model.title")} description={t("ai.apiConfig.model.description")}>
        <div className="flex items-center gap-2">
          <Select
            name="default_model"
            value={activeApiConfig?.default_model || ""}
            onChange={(value) =>
              onInputChange({ target: { name: "default_model", value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            disabled={loadingModels || availableModels.length === 0}
            className="ai-model-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            options={[
              { value: "", label: loadingModels ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select") },
              ...availableModels.map((model) => ({ label: model, value: model })),
            ]}
          />
          <Button
            onClick={onFetchModels}
            disabled={loadingModels || !activeApiConfig?.endpoint_url}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loadingModels ? t("ai.apiConfig.model.refreshing") : <Download size={16} />}
          </Button>
        </div>
      </Field>
    </FieldGroup>
  );
};
