import { useTranslation } from "react-i18next";
import { Field } from "../../../../components/Field";
import Input from "../../../../components/Input";

export function AnthropicSettings({
  anthropicApiBaseUrl,
  setAnthropicApiBaseUrl,
  aiApiKeyAnthropic,
  setAiApiKeyAnthropic,
}: {
  anthropicApiBaseUrl: string;
  setAnthropicApiBaseUrl: (value: string) => void;
  aiApiKeyAnthropic: string;
  setAiApiKeyAnthropic: (value: string) => void;
}) {
  const { t } = useTranslation("settings");

  return (
    <>
      <Field title={"Anthropic Base URL"}>
        <Input value={anthropicApiBaseUrl} onChange={setAnthropicApiBaseUrl} />
      </Field>
      <Field title={t("ai.anthropicApiKey", "Anthropic API 密钥")}>
        <Input type="password" value={String(aiApiKeyAnthropic)} onChange={setAiApiKeyAnthropic} />
      </Field>
    </>
  );
}