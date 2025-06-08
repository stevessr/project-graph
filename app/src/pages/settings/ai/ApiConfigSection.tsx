// src\pages\settings\ai\ApiConfigSection.tsx
import { useEffect } from "react";
import { useAiSettingsStore } from "../../../state/aiSettingsStore";
import { ApiConfig, Model } from "../../../types/aiSettings";
import Select from "../../../components/Select";
import Button from "../../../components/Button"; // Assuming you have a Button component
import { TFunction } from "i18next";
import { RefreshCcw } from "lucide-react";

interface ApiConfigSectionProps {
  api_configs: ApiConfig[];
  availableModels: Model[];
  loadingModels: boolean;
  onFetchModels: () => void;
  t: TFunction<"settings", undefined>;
  onEditConfig: (config: ApiConfig) => void;
  onAddConfig: () => void;
  onDeleteConfig: (configId: string) => void;
  onModelChange: (modelId: string) => void;
}

export function ApiConfigSection({
  api_configs,
  availableModels,
  loadingModels,
  onFetchModels,
  t,
  onEditConfig,
  onAddConfig,
  onDeleteConfig,
  onModelChange,
}: ApiConfigSectionProps) {
  const activeApiConfigId = useAiSettingsStore((state) => state.aiSettings?.active_config_id);
  const setActiveApiConfig = useAiSettingsStore((state) => state.setActiveAiConfig);
  const activeApiConfig = api_configs.find((c) => c.id === activeApiConfigId);

  useEffect(() => {
    const activeConfigExists = api_configs.some((c) => c.id === activeApiConfigId);
    if (!activeConfigExists && api_configs.length > 0) {
      setActiveApiConfig(api_configs[0].id);
    }
  }, [api_configs, activeApiConfigId, setActiveApiConfig]);

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
              value={activeApiConfigId || ""}
              options={api_configs.map((config) => ({
                label: config.name + "(" + config.provider + ")",
                value: config.id,
              }))}
              onChange={(value) => {
                setActiveApiConfig(value as string);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:border-gray-600 dark:bg-gray-700"
            />
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
                    options={availableModels.map((model) => ({
                      label: model.id || model.name,
                      value: model.id || model.name,
                    }))}
                    onChange={(newModel) => {
                      if (activeApiConfig && newModel) {
                        onModelChange(newModel);
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:border-gray-600 dark:bg-gray-700"
                  />
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
