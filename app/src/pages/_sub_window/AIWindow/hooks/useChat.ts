import { useAtom } from "jotai";
import { useRef, useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useChatVersioning } from "./useChatVersioning";
import { ChatMessage as ApiChatMessage } from "../../../../core/service/dataManageService/aiEngine/IAIEngine";
import { Settings } from "../../../../core/service/Settings";
import { activeProjectAtom } from "../../../../state";
import { AIMessage, ChatMessage, UserContent, UserMessage, AIResponse, AIProvider, availableProviders } from "../types";
import { useChatGeneration } from "./useChatGeneration";
import { useMessageEditing } from "./useMessageEditing";

export const useChat = (initialConversation?: ChatMessage[]) => {
  const [project] = useAtom(activeProjectAtom);
  const [inputValue, setInputValue] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>(initialConversation || []);
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiNotConfiguredError, setAiNotConfiguredError] = useState<boolean | string>(false);
  const [sessionSystemMessage, setSessionSystemMessage] = useState<string>("");
  const [currentProvider, setCurrentProvider] = useState<AIProvider>("google")

  const messagesElRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesElRef.current?.scrollTo({ top: messagesElRef.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [conversationHistory]);

  useEffect(() => {
    async function fetchInitialProvider() {
      const savedProvider = await Settings.get("aiProvider") as AIProvider;
      setCurrentProvider(savedProvider || "google") // 如果未设置，默认为 "google"
    }
    fetchInitialProvider()
  }, [])

  useEffect(() => {
    Settings.get("customSystemMessage").then(msg => {
      if (msg) {
        setSessionSystemMessage(msg);
      }
    });
  }, []);

  useEffect(() => {
    const initializeAI = async () => {
      if (!project) {
        return;
      }
      try {
        const provider = (await Settings.get("aiProvider")) || 'google';
        let apiKey: string | null = null;

        switch (provider) {
          case "google":
            apiKey = localStorage.getItem("AI_API_KEY_GEMINI");
            break;
          case "openai":
            apiKey = localStorage.getItem("AI_API_KEY_OPENAI");
            break;
          case "anthropic":
            apiKey = localStorage.getItem("AI_API_KEY_ANTHROPIC");
            break;
          case "openrouter":
            apiKey = localStorage.getItem("AI_API_KEY_OPENROUTER");
            break;
        }

        if (apiKey) {
          await project.aiEngine.updateConfig({ apiKey, provider });
          setAiNotConfiguredError(false)
        } else {
          setAiNotConfiguredError(`API key for ${provider} is not configured.`)
        }
      } catch (error) {
        console.error("Failed to initialize AI engine:", error);
        setAiNotConfiguredError("An error occurred during initialization.")
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAI();
  }, [project]);

  const updateMessageInHistory = (messageId: string, updates: Partial<AIMessage | UserMessage>) => {
    setConversationHistory(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          const updatedMsg = { ...msg, ...updates };
          if (msg.role === 'user' && updatedMsg.role === 'user') {
            return updatedMsg as UserMessage;
          }
          if (msg.role === 'assistant' && updatedMsg.role === 'assistant') {
            return updatedMsg as AIMessage;
          }
        }
        return msg;
      })
    );
  };

  const handleSwitchResponse = (messageId: string, newIndex: number) => {
    setConversationHistory(prev =>
      prev.map(msg => {
        if (msg.id === messageId && msg.role === 'assistant') {
          const aiMsg = msg as AIMessage;
          if (newIndex >= 0 && newIndex < aiMsg.responses.length) {
            return { ...aiMsg, activeResponseIndex: newIndex };
          }
        }
        return msg;
      })
    );
  };

  const prepareHistoryForAPI = (history: ChatMessage[]): ApiChatMessage[] => {
    return history
      .filter(msg => !(msg.role === 'assistant' && msg.isLoading))
      .map(msg => {
        let content = "";
        if (msg.role === 'user') {
          const userMsg = msg as UserMessage;
          content = userMsg.contentHistory[userMsg.activeVersionIndex].text;
        } else if (msg.role === 'assistant') {
          const aiMsg = msg as AIMessage;
          content = aiMsg.responses[aiMsg.activeResponseIndex]?.text || "";
        }
        return { role: msg.role, content };
      });
  };

  const { submitNewPrompt, handleRetry, generateResponseForVersion } = useChatGeneration({
    project: project || null,
    sessionSystemMessage,
    updateMessageInHistory,
    setAiNotConfiguredError,
    prepareHistoryForAPI,
    conversationHistory,
    setConversationHistory,
  });

  const handleSubmit = (prompt: string) => {
    submitNewPrompt(prompt);
    setInputValue("");
  }

  const {
    currentlyEditingMessageId,
    editingContent,
    setEditingContent,
    enterEditMode,
    cancelEditMode,
  } = useMessageEditing();
  
  const [branchCache, setBranchCache] = useState<Map<string, ChatMessage[]>>(new Map());

  const { handleUserVersionSwitch, handleSaveEdit: versioningHandleSaveEdit } = useChatVersioning({
    conversationHistory,
    setConversationHistory,
    generateResponseForVersion,
    setAiNotConfiguredError,
    branchCache,
    setBranchCache,
  });

  const handleSaveEdit = (messageId: string) => {
    versioningHandleSaveEdit(messageId, editingContent);
    cancelEditMode();
  };

  async function switchProvider(newProvider: AIProvider) {
    setIsInitializing(true)
    try {
      // 1. 持久化新设置
      await Settings.set("aiProvider", newProvider)
      setCurrentProvider(newProvider)

      // 2. 获取对应的 API Key
      const apiKey = localStorage.getItem(`AI_API_KEY_${newProvider.toUpperCase()}`)

      // 3. 验证 API Key
      if (!apiKey) {
        setAiNotConfiguredError(`API key for ${newProvider} is not configured.`)
        return
      }

      // 4. 更新 AI 引擎配置
      if (project) {
        await project.aiEngine.updateConfig({ apiKey, provider: newProvider })
        setAiNotConfiguredError(false)
      }
    } catch (error) {
      console.error("Failed to switch AI provider:", error)
      setAiNotConfiguredError("An error occurred while switching providers.")
    } finally {
      setIsInitializing(false)
    }
  }

  return {
    project,
    inputValue,
    setInputValue,
    conversationHistory,
    isInitializing,
    currentlyEditingMessageId,
    editingContent,
    setEditingContent,
    aiNotConfiguredError,
    sessionSystemMessage,
    setSessionSystemMessage,
    messagesElRef,
    handleSwitchResponse,
    submitNewPrompt: handleSubmit,
    handleRetry,
    handleUserVersionSwitch,
    enterEditMode,
    cancelEditMode,
    handleSaveEdit,
    currentProvider,
    handleProviderSwitch: switchProvider,
    availableProviders,
  };
};