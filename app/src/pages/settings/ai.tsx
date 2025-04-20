import { useTranslation } from "react-i18next";
import { Settings } from "../../core/service/Settings";
import { FieldGroup, SettingField } from "./_field";
import Input from "../../components/Input"; // Corrected import
// Removed Label import
import { Link } from "lucide-react"; // Icon for URL
import { KeyRound } from "lucide-react"; // Icon for Key

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
        {/* API URL Setting - title and description are now handled by translation keys */}
        <SettingField
          icon={<Link size={16} />}
          settingKey="aiApiUrl"
          type="text" // Use text type for URL input
          // Removed title and description props - they will be fetched via t(`${settingKey}.title`) etc.
        />

        {/* API Key Setting - Custom Input for Password Masking */}
        <div className="group/field flex items-center justify-between p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-neutral-500" />
            <div>
              {/* Replaced Label component with standard label tag */}
              <label htmlFor="aiApiKeyInput">{t("settings.ai.apiKey.title")}</label>
              <p className="text-xs text-neutral-500">{t("settings.ai.apiKey.description")}</p>
            </div>
          </div>
          <Input
            id="aiApiKeyInput"
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="w-48" // Adjust width as needed
            placeholder={t("settings.ai.apiKey.placeholder")}
          />
          {/* Optional: Add a reset button like in SettingField */}
          {/* <RotateCw
             className="text-panel-details-text h-4 w-4 cursor-pointer opacity-0 hover:rotate-180 group-hover/field:opacity-100"
             onClick={() => setApiKey(Settings.defaultSettings.aiApiKey)}
           /> */}
        </div>
        {/* Optional: Add a Test Connection Button here */}
        {/* <Button onClick={handleTestConnection}>Test Connection</Button> */}
      </FieldGroup>
      {/* Add more AI-related settings groups here if needed */}
    </div>
  );
}
