import { useTranslation } from "react-i18next";
import { Field } from "../../../../components/Field";
import Input from "../../../../components/Input";

function OpenAIResponseFormatSelector({
  selectedFormat,
  onFormatChange,
}: {
  selectedFormat: "response" | "traditional";
  onFormatChange: (format: "response" | "traditional") => void;
}) {
  const { t } = useTranslation("settings");

  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFormatChange(event.target.value as "response" | "traditional");
  };

  return (
    <div className="settings-group">
      <h4 className="text-base font-semibold mb-2">{t("ai.openai.responseFormat.title", "OpenAI JSON 响应格式")}</h4>
      <p className="text-sm text-gray-500 mb-4">
        {t("ai.openai.responseFormat.description", "选择 OpenAI 模型生成结构化 JSON 输出的方式。")}
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="response"
            checked={selectedFormat === "response"}
            onChange={handleFormatChange}
            className="form-radio mt-1 h-4 w-4 text-blue-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                {t("ai.openai.responseFormat.response.title", "响应格式模式")}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                {t("ai.openai.responseFormat.recommended", "推荐")}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {t("ai.openai.responseFormat.response.description", "使用官方 `response_format={ \"type\": \"json_object\" }` 参数。这是获取结构化 JSON 输出最可靠的方法。")}
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="traditional"
            checked={selectedFormat === "traditional"}
            onChange={handleFormatChange}
            className="form-radio mt-1 h-4 w-4 text-blue-600"
          />
          <div className="flex-1">
            <span className="font-semibold text-gray-800">
              {t("ai.openai.responseFormat.traditional.title", "传统提示模式")}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              {t("ai.openai.responseFormat.traditional.description", "通过系统提示词指示模型返回 JSON。此方法可靠性较低，仅在“响应格式模式”不受支持时使用。")}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

export function OpenAISettings({
  openaiResponseFormat,
  setOpenaiResponseFormat,
  openaiApiBaseUrl,
  setOpenaiApiBaseUrl,
  aiApiKeyOpenAI,
  setAiApiKeyOpenAI,
}: {
  openaiResponseFormat: "response" | "traditional";
  setOpenaiResponseFormat: (value: "response" | "traditional") => void;
  openaiApiBaseUrl: string;
  setOpenaiApiBaseUrl: (value: string) => void;
  aiApiKeyOpenAI: string;
  setAiApiKeyOpenAI: (value: string) => void;
}) {
  const { t } = useTranslation("settings");

  return (
    <>
      <Field title={"OpenAI Base URL"}>
        <Input value={openaiApiBaseUrl} onChange={setOpenaiApiBaseUrl} />
      </Field>
      <Field title={t("ai.openaiApiKey", "OpenAI API 密钥")}>
        <Input type="password" value={String(aiApiKeyOpenAI)} onChange={setAiApiKeyOpenAI} />
      </Field>
      <Field>
        <OpenAIResponseFormatSelector
          selectedFormat={openaiResponseFormat}
          onFormatChange={setOpenaiResponseFormat}
        />
      </Field>
    </>
  );
}