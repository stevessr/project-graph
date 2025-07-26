import { useTranslation } from "react-i18next";
import { Field } from "../../../../components/Field";
import Input from "../../../../components/Input";
import Switch from "../../../../components/Switch";
import { GeminiTTSGenerator } from "../GeminiTTSGenerator";

export function GeminiSettings({
  googleApiBaseUrl,
  setGoogleApiBaseUrl,
  aiApiKeyGemini,
  setAiApiKeyGemini,
  googleEnableGoogleSearch,
  setGoogleEnableGoogleSearch,
  googleEnableUrlContext,
  setGoogleEnableUrlContext,
  googleEnableCodeExecution,
  setGoogleEnableCodeExecution,
  googleEnableThinkingConfig,
  setGoogleEnableThinkingConfig,
  googleThinkingBudget,
  setGoogleThinkingBudget,
}: {
  googleApiBaseUrl: string;
  setGoogleApiBaseUrl: (value: string) => void;
  aiApiKeyGemini: string;
  setAiApiKeyGemini: (value: string) => void;
  googleEnableGoogleSearch: boolean;
  setGoogleEnableGoogleSearch: (value: boolean) => void;
  googleEnableUrlContext: boolean;
  setGoogleEnableUrlContext: (value: boolean) => void;
  googleEnableCodeExecution: boolean;
  setGoogleEnableCodeExecution: (value: boolean) => void;
  googleEnableThinkingConfig: boolean;
  setGoogleEnableThinkingConfig: (value: boolean) => void;
  googleThinkingBudget: number;
  setGoogleThinkingBudget: (value: number) => void;
}) {
  const { t } = useTranslation("settings");

  return (
    <>
      <Field title={"Google Base URL"}>
        <Input value={googleApiBaseUrl} onChange={setGoogleApiBaseUrl} />
      </Field>
      <Field title={t("ai.geminiApiKey", "Gemini API 密钥")}>
        <Input type="password" value={String(aiApiKeyGemini)} onChange={setAiApiKeyGemini} />
      </Field>
      <Field title={t("ai.google.enableGoogleSearch", "Enable Google Search")}>
        <Switch value={googleEnableGoogleSearch} onChange={setGoogleEnableGoogleSearch} />
      </Field>
      <Field title={t("ai.google.enableUrlContext", "Enable URL Context")}>
        <Switch value={googleEnableUrlContext} onChange={setGoogleEnableUrlContext} />
      </Field>
      <Field title={t("ai.google.enableCodeExecution", "Enable Code Execution")}>
        <Switch value={googleEnableCodeExecution} onChange={setGoogleEnableCodeExecution} />
      </Field>
      <Field title={t("ai.google.enableThinkingConfig", "Enable Thinking Config")}>
        <Switch value={googleEnableThinkingConfig} onChange={setGoogleEnableThinkingConfig} />
      </Field>
      {googleEnableThinkingConfig && (
        <Field title={t("ai.google.thinkingBudget", "Thinking Budget")}>
          <Input
            number
            value={String(googleThinkingBudget)}
            onChange={setGoogleThinkingBudget}
            min={-1}
            max={32768}
          />
        </Field>
      )}
      <GeminiTTSGenerator />
    </>
  );
}