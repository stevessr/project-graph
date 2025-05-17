import React from "react";
import { FieldGroup, Field } from "../../../components/Field";
import Input from "../../../components/Input";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { FileText, Save, Plus, CircleFadingArrowUp, CircleX } from "lucide-react";
import { AiSettings } from "../../../types/aiSettings";
import { TFunction } from "i18next";

interface PromptManagementSectionProps {
  settings: AiSettings;
  customPromptsString: string;
  selectedPromptName: string | null;
  selectedVersionTimestamp: number | null;
  newPromptName: string;
  onCustomPromptsStringChange: (value: string) => void;
  onNewPromptNameChange: (value: string) => void;
  onPromptSelect: (promptName: string) => void;
  onVersionSelect: (timestamp: number) => void;
  onCreateNewPrompt: () => Promise<void>;
  onSavePromptVersion: () => Promise<void>;
  onUpdateCurrentPromptVersion: () => Promise<void>;
  onDeleteSelectedVersion: () => Promise<void>;
  summaryPrompt: string | null;
  onSummaryPromptChange: (value: string) => void;
  t: TFunction<"settings", undefined>;
}

export const PromptManagementSection: React.FC<PromptManagementSectionProps> = ({
  settings,
  customPromptsString,
  selectedPromptName,
  selectedVersionTimestamp,
  newPromptName,
  onCustomPromptsStringChange,
  onNewPromptNameChange,
  onPromptSelect,
  onVersionSelect,
  onCreateNewPrompt,
  onSavePromptVersion,
  onUpdateCurrentPromptVersion,
  onDeleteSelectedVersion,
  summaryPrompt,
  onSummaryPromptChange,
  t,
}) => {
  return (
    <FieldGroup title={t("ai.prompts.title")} icon={<FileText />}>
      <Field
        title={t("ai.newPromptTitle") || "创建新提示词"}
        description={t("ai.newPromptDescription") || "输入新提示词的名称并创建"}
      >
        {" "}
        {/* TODO: Add translation keys */}
        <div className="flex items-center gap-2">
          <Input
            name="new_prompt_name_input"
            value={newPromptName}
            onChange={onNewPromptNameChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={t("ai.newPromptNamePlaceholder")}
          />
          <Button
            onClick={onCreateNewPrompt}
            disabled={!newPromptName.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Plus />
            {t("ai.createPromptButton") || "创建"} {/* TODO: Add translation key */}
          </Button>
        </div>
      </Field>

      <div className="flex items-center gap-2">
        <Field
          title={t("ai.selectPromptTitle") || "选择提示词"}
          description={t("ai.selectPromptDescription") || "从已保存的提示词中选择"}
        >
          {" "}
          {/* TODO: Add translation keys */}
          <Select
            name="selected_prompt_dropdown"
            value={selectedPromptName || ""}
            onChange={onPromptSelect}
            disabled={Object.keys(settings.prompt_collections || {}).length === 0}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            options={[
              { value: "", label: t("ai.selectAPrompt"), disabled: true },
              ...(settings.prompt_collections
                ? Object.keys(settings.prompt_collections).map((name) => ({ label: name, value: name }))
                : []),
            ]}
          />
        </Field>
      </div>

      {selectedPromptName &&
        settings.prompt_collections &&
        settings.prompt_collections[selectedPromptName]?.versions.length > 0 && (
          <Field
            title={t("ai.selectVersionTitle") || "选择版本"}
            description={t("ai.selectVersionDescription") || "选择该提示词的历史版本"}
          >
            {" "}
            {/* TODO: Add translation keys */}
            <div className="flex items-center gap-2">
              <Select
                name="selected_version_dropdown"
                value={selectedVersionTimestamp?.toString() || ""}
                onChange={(value) => onVersionSelect(Number(value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                options={settings.prompt_collections[selectedPromptName].versions.map((version) => ({
                  label: new Date(version.timestamp).toLocaleString(),
                  value: version.timestamp.toString(),
                }))}
              />
              {selectedVersionTimestamp !== null && (
                <Button
                  onClick={onDeleteSelectedVersion}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <CircleX size={14} className="mr-1" />
                  {t("ai.deleteVersionButton") || "删除"} {/* TODO: Add translation key */}
                </Button>
              )}
              {selectedPromptName && selectedVersionTimestamp !== null && customPromptsString.trim() && (
                <Button
                  onClick={onUpdateCurrentPromptVersion}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <CircleFadingArrowUp size={14} className="mr-1" />
                  {t("ai.updateVersionButton") || "更新"} {/* TODO: Add translation key */}
                </Button>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={onSavePromptVersion}
                  disabled={!selectedPromptName || !customPromptsString.trim()}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Save size={14} className="mr-1" />
                  {t("ai.saveNewVersionButton") || "新版本"} {/* TODO: Add translation key */}
                </Button>
              </div>
            </div>
          </Field>
        )}

      <Field title={t("ai.prompts.systemPrompt.title")} description={t("ai.prompts.systemPrompt.description")}>
        <Input
          name="custom_prompts_editor"
          rows={10}
          value={customPromptsString}
          onChange={onCustomPromptsStringChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm sm:ring-indigo-500"
          placeholder={t("ai.prompts.lineFormatPlaceholder")}
        />
        <p className="text-panel-text-lighter mt-1 text-xs">{t("ai.prompts.lineFormatHint")}</p>
      </Field>

      <Field title={t("ai.prompts.summaryPrompt.title")} description={t("ai.prompts.summaryPrompt.description")}>
        <Input
          name="summary_prompt_editor"
          rows={3}
          value={summaryPrompt || ""}
          onChange={onSummaryPromptChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder={t("ai.prompts.summaryPrompt.placeholder")}
        />
      </Field>
    </FieldGroup>
  );
};
