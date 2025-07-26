import { ChatMessage, UserMessage, UserContent } from "../types";
import { v4 as uuidv4 } from 'uuid';

interface UseChatVersioningProps {
  conversationHistory: ChatMessage[];
  setConversationHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  generateResponseForVersion: (history: ChatMessage[], promptVersionId: string) => Promise<void>;
  setAiNotConfiguredError: (value: boolean) => void;
  branchCache: Map<string, ChatMessage[]>;
  setBranchCache: React.Dispatch<React.SetStateAction<Map<string, ChatMessage[]>>>;
}

export const useChatVersioning = ({
  conversationHistory,
  setConversationHistory,
  generateResponseForVersion,
  setAiNotConfiguredError,
  branchCache,
  setBranchCache,
}: UseChatVersioningProps) => {

  const handleUserVersionSwitch = async (messageId: string, targetVersionIndex: number) => {
    setAiNotConfiguredError(false);
    const messageIndex = conversationHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = conversationHistory[messageIndex] as UserMessage;
    const currentVersionIndex = userMessage.activeVersionIndex;

    if (currentVersionIndex === targetVersionIndex) {
      return;
    }
    
    // 1. Save the current branch
    const currentVersionId = userMessage.contentHistory[currentVersionIndex].versionId;
    const subsequentMessages = conversationHistory.slice(messageIndex + 1);
    
    const newCache = new Map(branchCache);
    if (subsequentMessages.length > 0) {
      newCache.set(currentVersionId, subsequentMessages);
      setBranchCache(newCache);
    }
    
    // 2. Load the target branch
    const targetVersionId = userMessage.contentHistory[targetVersionIndex].versionId;

    // Update the active index on the message
    const updatedUserMessage: UserMessage = { ...userMessage, activeVersionIndex: targetVersionIndex };
    
    // Construct the base of the conversation
    const baseConversation = [...conversationHistory.slice(0, messageIndex), updatedUserMessage];

    if (newCache.has(targetVersionId)) {
      // Branch exists, restore it from cache
      const cachedBranch = newCache.get(targetVersionId)!;
      setConversationHistory([...baseConversation, ...cachedBranch]);
    } else {
      // Branch does not exist, truncate and generate a new response
      const newConversation = [...baseConversation];
      setConversationHistory(newConversation);
      generateResponseForVersion(newConversation, targetVersionId);
    }
  };

  const handleSaveEdit = (messageId: string, newContent: string) => {
    setAiNotConfiguredError(false);
    const messageIndex = conversationHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = conversationHistory[messageIndex] as UserMessage;
    const currentVersionIndex = userMessage.activeVersionIndex;
    const currentVersionId = userMessage.contentHistory[currentVersionIndex].versionId;

    // 1. Save the current branch before creating a new version
    const subsequentMessages = conversationHistory.slice(messageIndex + 1);
    const newCache = new Map(branchCache);
    if (subsequentMessages.length > 0) {
      newCache.set(currentVersionId, subsequentMessages);
      setBranchCache(newCache);
    }
    
    // 2. Create the new version and update the message
    const newVersion: UserContent = { versionId: uuidv4(), text: newContent };
    const newContentHistory = [...userMessage.contentHistory, newVersion];
    const updatedUserMessage: UserMessage = {
      ...userMessage,
      contentHistory: newContentHistory,
      activeVersionIndex: newContentHistory.length - 1
    };

    // 3. Truncate conversation and prepare for new branch
    const baseConversation = [...conversationHistory.slice(0, messageIndex), updatedUserMessage];
    setConversationHistory(baseConversation);
    
    // 4. Generate a response for the newly created version
    generateResponseForVersion(baseConversation, newVersion.versionId);
  };

  return {
    handleUserVersionSwitch,
    handleSaveEdit,
  };
};