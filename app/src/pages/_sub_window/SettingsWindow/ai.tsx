import { Brain, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "../../../components/Select";
import Switch from "../../../components/Switch";
import { Field } from "../../../components/Field";
import Input from "../../../components/Input";
import { Settings } from "../../../core/service/Settings";
import { AIEngine } from "../../../core/service/dataManageService/aiEngine/AIEngine";
import { AIModel } from "../../../core/service/dataManageService/aiEngine/IAIEngine";
import Button from "../../../components/Button";
import { OpenAISettings } from "./ai/OpenAISettings";
import { GeminiSettings } from "./ai/GeminiSettings";
import { AnthropicSettings } from "./ai/AnthropicSettings";
import { OpenRouterSettings } from "./ai/OpenRouterSettings";
import { aipgProviders, LeafProvider } from "../../../core/service/dataManageService/aiEngine/providerRegistry";

interface AIPGSettingsProps {
  providerInfo: LeafProvider;
  cloudflareAccountId: string;
  setCloudflareAccountId: (value: string) => void;
  aiGatewayId: string;
  setAiGatewayId: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
}

function AIPGSettings({
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

export default function AISettings() {
  const { t } = useTranslation("settings");
  const [customSystemMessage, setCustomSystemMessage] = Settings.use("customSystemMessage");
  const [aiProvider, setAiProvider] = Settings.use("aiProvider");
  const [selectedTopLevelProvider, setSelectedTopLevelProvider] = useState<string | undefined>();
  const [openaiApiBaseUrl, setOpenaiApiBaseUrl] = Settings.use("openaiApiBaseUrl");
  const [googleApiBaseUrl, setGoogleApiBaseUrl] = Settings.use("googleApiBaseUrl");
  const [anthropicApiBaseUrl, setAnthropicApiBaseUrl] = Settings.use("anthropicApiBaseUrl");
  const [cloudflareAccountId, setCloudflareAccountId] = Settings.use("cloudflareAccountId" as any);
  const [aiGatewayId, setAiGatewayId] = Settings.use("aiGatewayId" as any);

  // Replace single API key with provider-specific keys
  const [aiApiKeyGemini, setAiApiKeyGemini] = Settings.use("aiApiKeyGemini");
  const [aiApiKeyOpenAI, setAiApiKeyOpenAI] = Settings.use("aiApiKeyOpenAI");
  const [aiApiKeyAnthropic, setAiApiKeyAnthropic] = Settings.use("aiApiKeyAnthropic");
  const [aiApiKey, setAiApiKey] = Settings.use("aiApiKey");

  useEffect(() => {
    // This effect ensures that the localStorage is updated whenever a key changes.
    // The AIWindow will then read these values to configure the AI engine.
    if (aiApiKeyGemini) {
      localStorage.setItem("AI_API_KEY_GEMINI", String(aiApiKeyGemini));
    } else {
      localStorage.removeItem("AI_API_KEY_GEMINI");
    }
    if (aiApiKeyOpenAI) {
      localStorage.setItem("AI_API_KEY_OPENAI", String(aiApiKeyOpenAI));
    } else {
      localStorage.removeItem("AI_API_KEY_OPENAI");
    }
    if (aiApiKeyAnthropic) {
      localStorage.setItem("AI_API_KEY_ANTHROPIC", String(aiApiKeyAnthropic));
    } else {
      localStorage.removeItem("AI_API_KEY_ANTHROPIC");
    }
  }, [aiApiKeyGemini, aiApiKeyOpenAI, aiApiKeyAnthropic]);
  const [aiModel, setAiModel] = Settings.use("aiModel");
  const [enableStream, setEnableStream] = Settings.use("enableStream");
  const [openaiResponseFormat, setOpenaiResponseFormat] = Settings.use("openaiResponseFormat");
  const [googleEnableGoogleSearch, setGoogleEnableGoogleSearch] = Settings.use("googleEnableGoogleSearch");
  const [googleEnableUrlContext, setGoogleEnableUrlContext] = Settings.use("googleEnableUrlContext");
  const [googleEnableCodeExecution, setGoogleEnableCodeExecution] = Settings.use("googleEnableCodeExecution");
  const [googleEnableThinkingConfig, setGoogleEnableThinkingConfig] = Settings.use("googleEnableThinkingConfig");
  const [googleThinkingBudget, setGoogleThinkingBudget] = Settings.use("googleThinkingBudget");

  const [models, setModels] = useState<AIModel[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchModels = async () => {
    setIsFetching(true);
    try {
      const modelList = await AIEngine.getInstance(aiProvider as string).then((instance) => instance.getModels());
      setModels(modelList);
    } catch (error) {
      console.error("获取AI模型失败：", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (aiProvider) {
      handleFetchModels();
      const isAipgProvider = aipgProviders.providers.some((p) => p.id === aiProvider);
      if (isAipgProvider) {
        setSelectedTopLevelProvider("ai-gateway");
      } else {
        setSelectedTopLevelProvider(aiProvider as string);
      }
    }
  }, [aiProvider]);

  const handleTopLevelProviderChange = (value: string) => {
    setSelectedTopLevelProvider(value);
    setAiModel("");

    if (value !== "ai-gateway") {
      setAiProvider(value as any);
    } else {
      if (aipgProviders.providers.length > 0) {
        setAiProvider(aipgProviders.providers[0].id as any);
      }
    }
  };

  const handleSubProviderChange = (value: string) => {
    setAiProvider(value as any);
    setAiModel("");
  };

  const modelOptions = useMemo(() => {
    if (aiProvider === "openrouter") {
      const groups: { [vendor: string]: AIModel[] } = {};
      for (const model of models) {
        if (!groups[model.vendor]) {
          groups[model.vendor] = [];
        }
        groups[model.vendor].push(model);
      }
      return Object.entries(groups).map(([vendor, models]) => ({
        label: vendor,
        options: models.map((m) => ({ label: m.name, value: m.id })),
      }));
    }
    return models.map((m) => ({ label: m.name, value: m.id }));
  }, [models, aiProvider]);

  const renderProviderSettings = () => {
    switch (selectedTopLevelProvider) {
      case "openai":
        return (
          <OpenAISettings
            openaiApiBaseUrl={openaiApiBaseUrl}
            setOpenaiApiBaseUrl={setOpenaiApiBaseUrl}
            aiApiKeyOpenAI={aiApiKeyOpenAI}
            setAiApiKeyOpenAI={setAiApiKeyOpenAI}
            openaiResponseFormat={openaiResponseFormat}
            setOpenaiResponseFormat={setOpenaiResponseFormat}
          />
        );
      case "google":
        return (
          <GeminiSettings
            googleApiBaseUrl={googleApiBaseUrl}
            setGoogleApiBaseUrl={setGoogleApiBaseUrl}
            aiApiKeyGemini={aiApiKeyGemini}
            setAiApiKeyGemini={setAiApiKeyGemini}
            googleEnableGoogleSearch={googleEnableGoogleSearch}
            setGoogleEnableGoogleSearch={setGoogleEnableGoogleSearch}
            googleEnableUrlContext={googleEnableUrlContext}
            setGoogleEnableUrlContext={setGoogleEnableUrlContext}
            googleEnableCodeExecution={googleEnableCodeExecution}
            setGoogleEnableCodeExecution={setGoogleEnableCodeExecution}
            googleEnableThinkingConfig={googleEnableThinkingConfig}
            setGoogleEnableThinkingConfig={setGoogleEnableThinkingConfig}
            googleThinkingBudget={googleThinkingBudget}
            setGoogleThinkingBudget={setGoogleThinkingBudget}
          />
        );
      case "anthropic":
        return (
          <AnthropicSettings
            anthropicApiBaseUrl={anthropicApiBaseUrl}
            setAnthropicApiBaseUrl={setAnthropicApiBaseUrl}
            aiApiKeyAnthropic={aiApiKeyAnthropic}
            setAiApiKeyAnthropic={setAiApiKeyAnthropic}
          />
        );
      case "openrouter":
        return <OpenRouterSettings />;
      case "ai-gateway": {
        const providerInfo = aipgProviders.providers.find((p) => p.id === aiProvider);
        if (providerInfo) {
          return (
            <AIPGSettings
              providerInfo={providerInfo as LeafProvider}
              cloudflareAccountId={cloudflareAccountId as string}
              setCloudflareAccountId={setCloudflareAccountId as (value: string) => void}
              aiGatewayId={aiGatewayId as string}
              setAiGatewayId={setAiGatewayId as (value: string) => void}
              apiKey={aiApiKey as string}
              setApiKey={setAiApiKey as (value: string) => void}
            />
          );
        }
        return null;
      }
      default:
        return null;
    }
  };

  return (
    <>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Brain /> {t("tabs.ai", "AI")}
      </h2>
      <Field title={t("ai.provider", "AI 提供商")}>
        <Select
          value={selectedTopLevelProvider}
          onUpdate={handleTopLevelProviderChange}
          options={[
            { label: "OpenAI", value: "openai" },
            { label: "谷歌", value: "google" },
            { label: "Anthropic", value: "anthropic" },
            { label: "OpenRouter", value: "openrouter" },
            { label: "AI Gateway", value: "ai-gateway" },
          ]}
        />
      </Field>
      {selectedTopLevelProvider === "ai-gateway" && (
        <Field title={t("ai.gateway_provider", "网关提供商")}>
          <Select
            value={aiProvider as string}
            onUpdate={handleSubProviderChange}
            options={aipgProviders.providers.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Field>
      )}
      <Field title={t("ai.aiModel", "AI 模型")}>
        <div className="flex items-center gap-2">
          <Select options={modelOptions} value={aiModel as string} onUpdate={setAiModel as (value: string) => void} searchable={true} allowCustom={true} />
          <Button onClick={handleFetchModels} disabled={isFetching}>
            <Download />
          </Button>
        </div>
      </Field>
      <Field title={t("ai.stream", "启用流式响应")}>
        <Switch value={enableStream as boolean} onChange={setEnableStream as (value: boolean) => void} />
      </Field>
      <Field title={t("ai.customSystemMessage", "自定义系统消息")}>
        <textarea
          className="w-full h-24 p-2 border rounded-md bg-transparent"
          value={customSystemMessage as string}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomSystemMessage(e.target.value)}
        />
      </Field>
      {renderProviderSettings()}
    </>
  );
}
