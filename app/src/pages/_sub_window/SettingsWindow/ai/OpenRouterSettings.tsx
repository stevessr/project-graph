import { Field } from "../../../../components/Field";
import { Settings } from "../../../../core/service/Settings";
import { useTranslation } from "react-i18next";
import { KeyListManager } from "../../../../components/KeyListManager";

export function OpenRouterSettings() {
  const [apiKey, setApiKey] = Settings.use("aiApiKeyOpenRouter");
  const { t } = useTranslation("settings");

  const keys = apiKey ? apiKey.split('\n').filter(Boolean) : [];

  const handleKeysChange = (newKeys: string[]) => {
    setApiKey(newKeys.join('\n'));
  };

  return (
    <>
      <Field
        title={t("ai.openrouter.apiKey", "OpenRouter API 密钥")}
        description={t("ai.openrouter.apiKeyDesc", "添加或删除您的 API 密钥")}
      >
      </Field>
      <KeyListManager keys={keys} onKeysChange={handleKeysChange} />
    </>
  );
}