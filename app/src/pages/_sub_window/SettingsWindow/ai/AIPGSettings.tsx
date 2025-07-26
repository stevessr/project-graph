import { Field } from "../../../../components/Field";
import Input from "../../../../components/Input";
import { LeafProvider } from "../../../../core/service/dataManageService/aiEngine/providerRegistry";

interface AIPGSettingsProps {
  providerInfo: LeafProvider;
  cloudflareAccountId: string;
  setCloudflareAccountId: (value: string) => void;
  aiGatewayId: string;
  setAiGatewayId: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
}

export function AIPGSettings({
  providerInfo,
  cloudflareAccountId,
  setCloudflareAccountId,
  aiGatewayId,
  setAiGatewayId,
  apiKey,
  setApiKey,
}: AIPGSettingsProps) {
  const renderCredentialInputs = () => {
    if (!providerInfo.credentials) {
      return null;
    }
    return providerInfo.credentials.map((cred) => {
      let value;
      let setValue;

      switch (cred.key) {
        case 'cloudflareAccountId':
          value = cloudflareAccountId;
          setValue = setCloudflareAccountId;
          break;
        case 'aiGatewayId':
          value = aiGatewayId;
          setValue = setAiGatewayId;
          break;
        case 'apiToken':
          value = apiKey;
          setValue = setApiKey;
          break;
        default:
          // For future credentials that might be added
          return null;
      }

      return (
        <Field key={cred.key} title={cred.label}>
          <Input
            value={value}
            onChange={(e: any) => setValue(e.target.value)}
          />
        </Field>
      );
    });
  };

  return <>{renderCredentialInputs()}</>;
}