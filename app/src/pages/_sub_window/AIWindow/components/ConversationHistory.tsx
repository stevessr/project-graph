import React from 'react';
import { ChatMessage } from '../types';
import { ChatMessageItem } from './ChatMessageItem';

interface ConversationHistoryProps {
  conversationHistory: ChatMessage[];
  currentlyEditingMessageId: string | null;
  editingContent: string;
  onEnterEditMode: (messageId: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onEditingContentChange: (content: string) => void;
  onSwitchUserVersion: (messageId: string, newIndex: number) => void;
  onSwitchResponse: (messageId: string, newIndex: number) => void;
  onRetry: (messageId: string) => void;
  messagesElRef: React.RefObject<HTMLDivElement | null>;
  sessionSystemMessage: string;
  onSessionSystemMessageChange: (message: string) => void;
}

export const ConversationHistory = ({
  conversationHistory,
  currentlyEditingMessageId,
  editingContent,
  onEnterEditMode,
  onSaveEdit,
  onCancelEdit,
  onEditingContentChange,
  onSwitchUserVersion,
  onSwitchResponse,
  onRetry,
  messagesElRef,
  sessionSystemMessage,
  onSessionSystemMessageChange,
}: ConversationHistoryProps) => {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto" ref={messagesElRef}>
      <details className="el-ai-system-prompt-details">
        <summary className="el-ai-system-prompt-summary">System Prompt</summary>
        <textarea
          value={sessionSystemMessage}
          onChange={(e) => onSessionSystemMessageChange(e.target.value)}
          className="w-full rounded-md border p-2 mt-2"
          placeholder="Enter a system message for this session..."
        />
      </details>
      {conversationHistory.map((msg) => (
        <ChatMessageItem
          key={msg.id}
          msg={msg}
          currentlyEditingMessageId={currentlyEditingMessageId}
          editingContent={editingContent}
          onEnterEditMode={onEnterEditMode}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onEditingContentChange={onEditingContentChange}
          onSwitchUserVersion={onSwitchUserVersion}
          onSwitchResponse={onSwitchResponse}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
};