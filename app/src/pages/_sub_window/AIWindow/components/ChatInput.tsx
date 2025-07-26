import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Loader2, Plug, Send, SettingsIcon } from "lucide-react";
import AISettings from "../../SettingsWindow/ai";
import { SubWindow } from "../../../../core/service/SubWindow";
import { MCPSettings } from "./MCPSettings";
import { ProviderSwitcher } from "./ProviderSwitcher";
import { AIProvider } from "../types";

interface ChatInputProps {
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  isInitializing: boolean;
  isLoading: boolean;
  aiNotConfiguredError: boolean;
  currentProvider: AIProvider;
  availableProviders: readonly AIProvider[];
  onProviderChange: (newProvider: AIProvider) => void;
  onMenuChange: (menu: React.ReactNode) => void;
}

export const ChatInput = ({
  inputValue,
  onInputValueChange,
  onSubmit,
  isInitializing,
  isLoading,
  aiNotConfiguredError,
  currentProvider,
  availableProviders,
  onProviderChange,
  onMenuChange,
}: ChatInputProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isInitializing) {
        onSubmit(inputValue);
      }
    }
  };

  return (
    <div className="el-ai-input flex flex-col gap-2 rounded-xl border p-2">
      {aiNotConfiguredError && (
        <div className="text-red-500 text-sm p-1 text-center">
          AI 引擎未配置。请点击{" "}
          <SettingsIcon
            className="inline-block mx-1 cursor-pointer"
            size={16}
            onClick={() =>
              SubWindow.create({
                title: "AI Settings",
                children: <AISettings />,
                rect: new Rectangle(new Vector(8, 88), new Vector(350, window.innerHeight - 96)),
              })
            }
          />{" "}
          按钮进行配置。
        </div>
      )}
      <div className="flex gap-2">
        <SettingsIcon
          className="el-ai-input-button cursor-pointer"
          onClick={() =>
            SubWindow.create({
              title: "AI Settings",
              children: <AISettings />,
              rect: new Rectangle(new Vector(8, 88), new Vector(350, window.innerHeight - 96)),
            })
          }
        />
        <ProviderSwitcher
          currentProvider={currentProvider}
          availableProviders={availableProviders}
          onProviderChange={onProviderChange}
          onMenuChange={onMenuChange}
        />
        <Plug
          className="el-ai-input-button cursor-pointer"
          onClick={() =>
            SubWindow.create({
              title: "MCP Settings",
              children: <MCPSettings />,
              rect: new Rectangle(new Vector(8, 88), new Vector(350, window.innerHeight - 96)),
            })
          }
        />
        <div className="flex-1"></div>
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Send
            className={`el-ai-input-button ${isInitializing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            aria-label="send"
            onClick={() => !isInitializing && onSubmit(inputValue)}
          />
        )}
      </div>
      <textarea
        className="cursor-text outline-none"
        placeholder={isInitializing ? "Initializing AI Engine..." : "What can I say?"}
        value={inputValue}
        onChange={(e) => onInputValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isInitializing}
      />
    </div>
  );
};