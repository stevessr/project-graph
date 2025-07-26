import { v4 as uuidv4 } from 'uuid';
import { ChatMessage as ApiChatMessage } from "../../../../core/service/dataManageService/aiEngine/IAIEngine";
import { Settings } from "../../../../core/service/Settings";
import { AIMessage, ChatMessage, UserContent, UserMessage, AIResponse } from "../types";
import { Project } from '../../../../core/Project';

interface UseChatGenerationProps {
  project: Project | null;
  sessionSystemMessage: string;
  updateMessageInHistory: (messageId: string, updates: Partial<AIMessage | UserMessage>) => void;
  setAiNotConfiguredError: (error: boolean) => void;
  prepareHistoryForAPI: (history: ChatMessage[]) => ApiChatMessage[];
  conversationHistory: ChatMessage[];
  setConversationHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const useChatGeneration = ({
  project,
  sessionSystemMessage,
  updateMessageInHistory,
  setAiNotConfiguredError,
  prepareHistoryForAPI,
  conversationHistory,
  setConversationHistory,
}: UseChatGenerationProps) => {

  const submitNewPrompt = async (promptContent: string) => {
    if (!project || !promptContent.trim()) return;

    setAiNotConfiguredError(false);
    let currentHistory = [...conversationHistory];

    let lastMessageIndex = -1;
    for (let i = currentHistory.length - 1; i >= 0; i--) {
      const msg = currentHistory[i];
      if (msg.role !== 'assistant' || !msg.isLoading) {
        lastMessageIndex = i;
        break;
      }
    }

    if (lastMessageIndex > -1) {
      const lastMessage = currentHistory[lastMessageIndex];
      if (lastMessage.role === 'assistant') {
        const aiMsg = lastMessage as AIMessage;
        if (aiMsg.activeResponseIndex < aiMsg.responses.length - 1) {
          currentHistory = currentHistory.slice(0, lastMessageIndex + 1);
        }
      }
    }

    const newUserContent: UserContent = { versionId: uuidv4(), text: promptContent };
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      contentHistory: [newUserContent],
      activeVersionIndex: 0,
      timestamp: Date.now(),
    };

    const loadingAiMessageId = uuidv4();
    const loadingAiMessage: AIMessage = {
      id: loadingAiMessageId,
      role: 'assistant',
      responses: [{ responseId: uuidv4(), text: "...", promptVersionId: newUserContent.versionId }],
      activeResponseIndex: 0,
      isLoading: true,
      timestamp: Date.now(),
    };

    const newHistory = [...currentHistory, userMessage, loadingAiMessage];
    setConversationHistory(newHistory);

    try {
      const historyForAPI = prepareHistoryForAPI([...currentHistory, userMessage]);
      const stream = await project.aiEngine.chat(
        historyForAPI,
        {
          model: await Settings.get("aiModel"),
          systemMessage: sessionSystemMessage,
        }
      );

      let streamingMsg = "";
      const newResponseId = uuidv4();
      for await (const chunk of stream) {
        streamingMsg += chunk;
        updateMessageInHistory(loadingAiMessageId, {
          responses: [{ responseId: newResponseId, text: streamingMsg, promptVersionId: newUserContent.versionId }]
        });
      }
      updateMessageInHistory(loadingAiMessageId, { isLoading: false, isError: false, timestamp: Date.now() });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Google AI Engine is not initialized')) {
        setAiNotConfiguredError(true);
        updateMessageInHistory(loadingAiMessageId, {
          responses: [{
            responseId: uuidv4(),
            text: "AI 引擎未配置。请点击设置按钮进行配置。",
            promptVersionId: newUserContent.versionId
          }],
          isLoading: false,
          isError: true,
        });
      } else {
        console.error("AI chat error:", error);
        updateMessageInHistory(loadingAiMessageId, {
          responses: [{ responseId: uuidv4(), text: "请求失败", promptVersionId: newUserContent.versionId }],
          isLoading: false,
          isError: true,
        });
      }
    }
  };

  const handleRetry = async (aiMessageId: string) => {
    if (!project) return;
    setAiNotConfiguredError(false);
    const aiMessageIndex = conversationHistory.findIndex(msg => msg.id === aiMessageId);
    if (aiMessageIndex < 1) return;

    const baseConversation = conversationHistory.slice(0, aiMessageIndex);
    const userMessage = conversationHistory[aiMessageIndex - 1] as UserMessage;
    const activeUserContent = userMessage.contentHistory[userMessage.activeVersionIndex];
    
    const aiMessage = conversationHistory[aiMessageIndex] as AIMessage;
    
    updateMessageInHistory(aiMessageId, { isLoading: true });
    setConversationHistory(baseConversation);

    try {
      const stream = await project.aiEngine.chat(
        prepareHistoryForAPI(baseConversation),
        {
          model: await Settings.get("aiModel"),
          systemMessage: sessionSystemMessage,
        }
      );
      
      let streamingMsg = "";
      const newResponseId = uuidv4();
      let newResponse: AIResponse | null = null;
      let isFirstChunk = true;

      for await (const chunk of stream) {
        streamingMsg += chunk;
        if (isFirstChunk) {
          isFirstChunk = false;
          newResponse = { responseId: newResponseId, text: streamingMsg, promptVersionId: activeUserContent.versionId };
          const updatedResponses = [...aiMessage.responses, newResponse];
          const updatedAIMessage: AIMessage = {
            ...aiMessage,
            responses: updatedResponses,
            activeResponseIndex: updatedResponses.length - 1,
            isLoading: true,
            isError: false,
          };
          setConversationHistory(prev => [...prev, updatedAIMessage]);
        } else if (newResponse) {
          const liveMessage = conversationHistory.find(m => m.id === aiMessageId);
          if (liveMessage && liveMessage.role === 'assistant') {
            const updatedResponses = [...liveMessage.responses];
            updatedResponses[updatedResponses.length - 1] = { ...newResponse, text: streamingMsg };
            updateMessageInHistory(aiMessageId, { responses: updatedResponses });
          }
        }
      }
      updateMessageInHistory(aiMessageId, { isLoading: false, timestamp: Date.now() });
    } catch (error) {
      const isConfigError = error instanceof Error && error.message.includes('Google AI Engine is not initialized');
      if (isConfigError) {
        setAiNotConfiguredError(true);
      } else {
        console.error("AI chat retry error:", error);
      }

      const errorText = isConfigError ? "AI 引擎未配置。请点击设置按钮进行配置。" : "生成时出错，请重试。";
      const newErrorResponse: AIResponse = {
        responseId: uuidv4(),
        text: errorText,
        promptVersionId: activeUserContent.versionId,
      };
      const finalAIMessage: AIMessage = {
        ...aiMessage,
        responses: [...aiMessage.responses, newErrorResponse],
        activeResponseIndex: aiMessage.responses.length,
        isLoading: false,
        isError: true,
      };
      setConversationHistory(prev => [...prev, finalAIMessage]);
    }
  };

  const generateResponseForVersion = async (history: ChatMessage[], promptVersionId: string) => {
    if (!project) return;
    
    const loadingAiMessageId = uuidv4();
    const loadingAiMessage: AIMessage = {
      id: loadingAiMessageId,
      role: 'assistant',
      responses: [{ responseId: uuidv4(), text: "...", promptVersionId }],
      activeResponseIndex: 0,
      isLoading: true,
      timestamp: Date.now(),
    };
    
    setConversationHistory(prev => [...prev, loadingAiMessage]);

    try {
      const historyForAPI = prepareHistoryForAPI(history);
      const stream = await project.aiEngine.chat(
        historyForAPI,
        {
          model: await Settings.get("aiModel"),
          systemMessage: sessionSystemMessage,
        }
      );
      
      let streamingMsg = "";
      const newResponseId = uuidv4();
      for await (const chunk of stream) {
        streamingMsg += chunk;
        updateMessageInHistory(loadingAiMessageId, {
          responses: [{ responseId: newResponseId, text: streamingMsg, promptVersionId: promptVersionId }]
        });
      }
      updateMessageInHistory(loadingAiMessageId, { isLoading: false, isError: false, timestamp: Date.now() });
    } catch (error) {
      console.error("AI chat version switch error:", error);
      const isConfigError = error instanceof Error && error.message.includes('Google AI Engine is not initialized');
      if (isConfigError) {
        setAiNotConfiguredError(true);
      }
      const errorText = isConfigError ? "AI 引擎未配置。请点击设置按钮进行配置。" : "加载此版本对话失败";
      updateMessageInHistory(loadingAiMessageId, {
        responses: [{ responseId: uuidv4(), text: errorText, promptVersionId: promptVersionId }],
        isLoading: false,
        isError: true,
      });
    }
  };

  return { submitNewPrompt, handleRetry, generateResponseForVersion };
};