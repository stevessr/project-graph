import { useTranslation } from "react-i18next";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Settings } from "../../core/service/Settings";
import { FieldGroup, SettingField } from "../../components/Field"; // Corrected import path to components/Field
// Removed Label import
import { Link, KeyRound, Cpu } from "lucide-react"; // Added Cpu icon

export default function AI() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4">
      <FieldGroup title={t("settings.ai.groupTitle")} icon={<KeyRound />}>
        {/* API URL Setting */}
        <SettingField icon={<Link size={16} />} settingKey="aiApiUrl" type="text" />

        {/* API Key Setting */}
        <SettingField icon={<KeyRound size={16} />} settingKey="aiApiKey" type="password" />

        {/* AI Model Name Setting */}
        <SettingField icon={<Cpu size={16} />} settingKey="aiModelName" type="text" />

        {/* AI Custom Prompt Setting */}
        <SettingField settingKey="aiCustomPrompt" type="textarea" />

        {/* Custom CSS Setting */}
        <SettingField icon={<Cpu size={16} />} settingKey="customCss" type="textarea" />

        {/* Optional: Add a Test Connection Button here */}
        {/* <Button onClick={handleTestConnection}>Test Connection</Button> */}
      </FieldGroup>
      {/* Add more AI-related settings groups here if needed */}
    </div>
  );
}
