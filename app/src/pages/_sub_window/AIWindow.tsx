import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { FolderOpen } from "lucide-react";
import { SubWindow } from "../../core/service/SubWindow";
import { ChatMessage } from "./AIWindow/types";
import { ConversationHistory } from "./AIWindow/components/ConversationHistory";
import { ChatInput } from "./AIWindow/components/ChatInput";
import { useChat } from "./AIWindow/hooks/useChat";
import { useState, useEffect } from "react";

export default function AIWindow({ id, initialConversation }: { id: string, initialConversation?: ChatMessage[] }) {
  const {
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
    submitNewPrompt,
    handleRetry,
    handleUserVersionSwitch,
    enterEditMode: enterEditModeHandler,
    cancelEditMode,
    handleSaveEdit,
    currentProvider,
    handleProviderSwitch,
    availableProviders,
  } = useChat(initialConversation);
  
  const [topLayerChildren, setTopLayerChildren] = useState<React.ReactNode>(null);

  useEffect(() => {
    SubWindow.update(id, { topLayerChildren });
  }, [id, topLayerChildren]);

  const handleEnterEditMode = (messageId: string) => {
    const messageToEdit = conversationHistory.find((msg) => msg.id === messageId && msg.role === "user");
    if (messageToEdit && messageToEdit.role === "user") {
      enterEditModeHandler(messageToEdit);
    }
  };

  return project ? (
    <div className="relative flex h-full flex-col p-2">
      <ConversationHistory
        conversationHistory={conversationHistory}
        currentlyEditingMessageId={currentlyEditingMessageId}
        editingContent={editingContent}
        onEnterEditMode={handleEnterEditMode}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={cancelEditMode}
        onEditingContentChange={setEditingContent}
        onSwitchUserVersion={handleUserVersionSwitch}
        onSwitchResponse={handleSwitchResponse}
        onRetry={handleRetry}
        messagesElRef={messagesElRef}
        sessionSystemMessage={sessionSystemMessage}
        onSessionSystemMessageChange={setSessionSystemMessage}
      />
      <ChatInput
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        onSubmit={submitNewPrompt}
        isInitializing={isInitializing}
        isLoading={conversationHistory.some((m) => m.role === "assistant" && m.isLoading)}
        aiNotConfiguredError={!!aiNotConfiguredError}
        currentProvider={currentProvider}
        availableProviders={availableProviders}
        onProviderChange={handleProviderSwitch}
        onMenuChange={setTopLayerChildren}
      />
    </div>
  ) : (
    <div className="flex flex-col gap-2 p-8">
      <FolderOpen />
      请先打开一个文件
    </div>
  );
}

AIWindow.open = () => {
  const win = SubWindow.create({
    title: "AI",
    rect: new Rectangle(new Vector(8, 88), new Vector(350, window.innerHeight - 96)),
  });
  SubWindow.update(win.id, { children: <AIWindow id={win.id} /> });
};
