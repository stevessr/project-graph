import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../../../../components/Button";
import Input from "../../../../components/Input";
import Switch from "../../../../components/Switch";
import { Settings } from "../../../../core/service/Settings";

export function MCPSettings() {
  const { t } = useTranslation("settings");
  const [mcpServers, setMcpServers] = Settings.use("mcpServers");

  return (
    <>
      <h3 className="mt-4 text-base font-bold">{t("ai.mcp.title", "MCP 工具服务器")}</h3>
      {(mcpServers || []).map((server, index) => (
        <div key={server.id} className="flex items-center gap-2 mt-2">
          <Input
            value={server.url}
            onChange={(url) => {
              const newServers = [...(mcpServers || [])];
              newServers[index] = { ...newServers[index], url };
              setMcpServers(newServers);
            }}
            className="flex-grow"
            placeholder={t("ai.mcp.serverUrlPlaceholder", "http://localhost:8000")}
          />
          <Switch
            value={server.enabled}
            onChange={(enabled) => {
              const newServers = [...(mcpServers || [])];
              newServers[index] = { ...newServers[index], enabled };
              setMcpServers(newServers);
            }}
          />
          <Button
            onClick={() => {
              const newServers = (mcpServers || []).filter((s) => s.id !== server.id);
              setMcpServers(newServers);
            }}
            variant="ghost"
            size="icon"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        onClick={() => {
          setMcpServers([...(mcpServers || []), { id: crypto.randomUUID(), url: "", enabled: true }]);
        }}
        className="mt-2"
      >
        {t("ai.mcp.addServer", "添加服务器")}
      </Button>
    </>
  );
}