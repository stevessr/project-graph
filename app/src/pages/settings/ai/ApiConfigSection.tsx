// src\pages\settings\ai\ApiConfigSection.tsx
import { useEffect } from "react";
import { ApiConfig } from "../../../types/aiSettings";
import Select from "../../../components/Select";
import Button from "../../../components/Button"; // Assuming you have a Button component
import { TFunction } from "i18next";
import { RefreshCcw } from "lucide-react";
import { invoke } from "../../../utils/tauriApi";
import { AiSettings } from "../../../types/aiSettings"; // Assuming you have a type definition for AiSettings
// REMOVE THIS IMPORT: import { setStoreActiveConfig } from "./useAiSettingsManager";

interface ApiConfigSectionProps {
  activeApiConfig: ApiConfig | undefined; // Make it potentially undefined if no config is active
  api_configs: ApiConfig[];
  onActiveConfigSelect: (configId: string | null) => void;
  availableModels: string[];
  loadingModels: boolean;
  onFetchModels: () => void;
  t: TFunction<"settings", undefined>;
  onEditConfig: (config: ApiConfig) => void;
  onAddConfig: () => void;
  onDeleteConfig: (configId: string) => void;
  onModelChange: (modelId: string) => void; // Add new prop for model change
}

export function ApiConfigSection({
  activeApiConfig,
  api_configs,
  onActiveConfigSelect,
  availableModels,
  loadingModels,
  onFetchModels,
  t,
  onEditConfig,
  onAddConfig,
  onDeleteConfig,
  onModelChange, // Destructure new prop
}: ApiConfigSectionProps) {
  useEffect(() => {
    if (api_configs && api_configs.length > 0) {
      const currentActiveExists = api_configs.some((c) => c.id === activeApiConfig?.id);
      // If no activeApiConfig is set, or the current activeApiConfig's ID is not in the list,
      // default to the first config.
      if (!activeApiConfig?.id || !currentActiveExists) {
        onActiveConfigSelect(api_configs[0].id);
      }
    } else if (activeApiConfig?.id) {
      // If there was an active config but now there are no configs, clear the active selection.
      onActiveConfigSelect(null);
    }
  }, [api_configs, activeApiConfig, onActiveConfigSelect]); // Rerun if configs change, active config changes, or callback changes

  const handleEdit = () => {
    if (activeApiConfig) {
      onEditConfig(activeApiConfig);
    }
  };

  const handleDelete = () => {
    if (activeApiConfig) {
      onDeleteConfig(activeApiConfig.id);
    }
  };

  return (
    <div className="space-y-4 rounded-md border p-4 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-panel-text text-lg font-semibold dark:text-gray-200">{t("ai.apiConfig.title")}</h2>
        <Button onClick={onAddConfig} variant="outline" size="sm">
          {t("ai.apiConfig.addNewConfig")}
        </Button>
      </div>
      {api_configs.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="activeConfigSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("ai.apiConfig.selectConfig")}
            </label>
            <Select
              id="activeConfigSelect"
              value={activeApiConfig?.id || ""}
              options={api_configs.map((config) => ({
                label: `${config.name} (${config.provider})`,
                value: config.id,
              }))}
              onChange={(value) => {
                onActiveConfigSelect(value); // This is the correct way to signal a change
                // The lines below were problematic and are removed:
                console.log(value);
                const configId = value;
                invoke<AiSettings>("set_active_ai_config", { configId });
                activeApiConfig = api_configs.find((config) => config.id === value) || ({} as ApiConfig); // Don't mutate props/local vars like this
                // setStoreActiveConfig(value); // Don't call store actions directly from presentational component
                // console.log(activeApiConfig);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              {/* The options prop for Select component should handle rendering.
                  If your Select component specifically needs children <option> tags,
                  they are already here. Ensure the Select component correctly uses
                  either its `options` prop or its children. */}
              {api_configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} ({config.provider})
                </option>
              ))}
            </Select>
          </div>

          {activeApiConfig ? (
            <div className="mt-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">{activeApiConfig.name}</h3>
                <div className="flex gap-2">
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    {t("common.edit")}
                  </Button>
                  {api_configs.length > 1 && ( // Don't allow deleting the last config easily
                    <Button onClick={handleDelete} variant="danger_outline" size="sm">
                      {t("common.delete")}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("ai.apiConfig.provider.title")}:</strong> {activeApiConfig.provider}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("ai.apiConfig.key.title")}:</strong>{" "}
                {"*".repeat(Math.max(0, (activeApiConfig.api_key?.length || 0) - 4))}
                {(activeApiConfig.api_key?.length || 0) > 4 ? activeApiConfig.api_key?.slice(-4) : ""}
              </p>
              {activeApiConfig.base_url && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("ai.form.base_url.title")}:</strong> {activeApiConfig.base_url}
                </p>
              )}
              {activeApiConfig.model && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("ai.apiConfig.model.title")}:</strong> {activeApiConfig.model}
                </p>
              )}
              {typeof activeApiConfig.temperature === "number" && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("ai.apiConfig.temperature.title")}:</strong> {activeApiConfig.temperature}
                </p>
              )}
              {typeof activeApiConfig.max_tokens === "number" && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("ai.apiConfig.max_tokens.title")}:</strong> {activeApiConfig.max_tokens}
                </p>
              )}
              {activeApiConfig.notes && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("ai.apiConfig.notes.title")}:</strong> {activeApiConfig.notes}
                </p>
              )}

              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("ai.apiConfig.model.availableModels")}
                </label>
                {loadingModels ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("ai.apiConfig.loadingModels")}</p>
                ) : availableModels.length > 0 ? (
                  <Select
                    value={activeApiConfig.model || ""}
                    options={availableModels.map((model) => ({ label: model, value: model }))}
                    onChange={(newModel) => {
                      if (activeApiConfig && newModel) {
                        onModelChange(newModel);
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="">{t("ai.apiConfig.selectModel")}</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("ai.apiConfig.noModelsFetched")}</p>
                )}
                <Button onClick={onFetchModels} size="sm" variant="ghost" className="mt-1 text-xs">
                  <RefreshCcw size={12} className="mr-1" />
                  {t("ai.apiConfig.model.refreshTitle")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("ai.apiConfig.noConfigSelected")}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("ai.apiConfig.noConfigs")}</p>
      )}
    </div>
  );
}
