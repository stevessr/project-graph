import { useTranslation } from "react-i18next";
import { Settings } from "../../core/service/Settings";
import { FieldGroup, SettingField } from "../../components/Field"; // Corrected import path to components/Field
import Input from "../../components/Input"; // Corrected import
// Removed Label import
import { Link, KeyRound, Cpu } from "lucide-react"; // Added Cpu icon

export default function AI() {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = Settings.use("aiApiKey"); // Use the hook for direct state binding

  // Corrected handler to accept string directly, as expected by the Input component's onChange prop
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <FieldGroup title={t("settings.ai.groupTitle")} icon={<KeyRound />}>
        {/* API URL Setting */}
        <SettingField icon={<Link size={16} />} settingKey="aiApiUrl" type="text" />

        {/* API Key Setting */}
        <div className="group/field flex items-center justify-between p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-neutral-500" />
            <div>
              <label htmlFor="aiApiKeyInput">{t("settings.ai.apiKey.title")}</label>
              <p className="text-xs text-neutral-500">{t("settings.ai.apiKey.description")}</p>
            </div>
          </div>
          <Input
            id="aiApiKeyInput"
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="w-48"
            placeholder={t("settings.ai.apiKey.placeholder")}
          />
          {/* Optional: Add a reset button */}
        </div>

        {/* AI Model Name Setting */}
        <SettingField icon={<Cpu size={16} />} settingKey="aiModelName" type="text" />

        {/* AI Custom Prompt Setting */}
        <SettingField settingKey="aiCustomPrompt" type="textarea" />

        {/* Optional: Add a Test Connection Button here */}
        {/* <Button onClick={handleTestConnection}>Test Connection</Button> */}
      </FieldGroup>
      {/* Add more AI-related settings groups here if needed */}
    </div>
  );
}
