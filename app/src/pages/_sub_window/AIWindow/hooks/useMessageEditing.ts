// src/pages/_sub_window/AIWindow/hooks/useMessageEditing.ts
import { useState, useCallback } from 'react';
import { UserMessage } from '../types';

export function useMessageEditing() {
  const [currentlyEditingMessageId, setCurrentlyEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  const enterEditMode = useCallback((message: UserMessage) => {
    setCurrentlyEditingMessageId(message.id);
    setEditingContent(message.content);
  }, []);

  const cancelEditMode = useCallback(() => {
    setCurrentlyEditingMessageId(null);
    setEditingContent('');
  }, []);

  return {
    currentlyEditingMessageId,
    editingContent,
    setEditingContent,
    enterEditMode,
    cancelEditMode,
  };
}