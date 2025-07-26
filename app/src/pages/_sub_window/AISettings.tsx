import { Settings } from "../../core/service/Settings";
import { useTranslation } from "react-i18next";
import { Field } from "../../components/Field";
import Switch from "../../components/Switch";
import Select from "../../components/Select";
import { Brain } from "lucide-react";

export const AISettings = () => {
  const [aiProvider, setAiProvider] = Settings.use("aiProvider");
  const [enableStream, setEnableStream] = Settings.use("enableStream");
  const [openaiResponseType, setOpenaiResponseType] = Settings.use("openaiResponseType");
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Brain /> {t("ai_settings")}
      </h2>

      <Field title={t("ai_provider")}>
        <Select
          value={aiProvider}
          onUpdate={setAiProvider}
          options={[
            { value: "openai", label: "OpenAI" },
            { value: "anthropic", label: "Anthropic" },
            { value: "google", label: "Google" },
          ]}
        />
      </Field>

      <Field title={t("enable_stream_response")}>
        <Switch value={enableStream} onChange={setEnableStream} />
      </Field>

      {aiProvider === "openai" && (
        <Field title={t("openai_response_type")}>
          <Select
            value={openaiResponseType}
            onUpdate={setOpenaiResponseType}
            options={[
              { value: "chat", label: "Chat" },
              { value: "response", label: "Response" },
            ]}
          />
        </Field>
      )}
    </div>
  );
};
