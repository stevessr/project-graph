import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw, X } from "lucide-react";
import Markdown from "../../../../components/Markdown";
import { AIMessage, UserMessage } from "../types";

interface ChatMessageItemProps {
  msg: UserMessage | AIMessage;
  currentlyEditingMessageId: string | null;
  editingContent: string;
  onEnterEditMode: (messageId: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onEditingContentChange: (content: string) => void;
  onSwitchUserVersion: (messageId: string, newIndex: number) => void;
  onSwitchResponse: (messageId: string, newIndex: number) => void;
  onRetry: (messageId: string) => void;
}

export const ChatMessageItem = ({
  msg,
  currentlyEditingMessageId,
  editingContent,
  onEnterEditMode,
  onSaveEdit,
  onCancelEdit,
  onEditingContentChange,
  onSwitchUserVersion,
  onSwitchResponse,
  onRetry
}: ChatMessageItemProps) => {
  if (msg.role === 'user') {
    const userMsg = msg as UserMessage;
    const contentToRender = userMsg.contentHistory[userMsg.activeVersionIndex].text;
    const totalVersions = userMsg.contentHistory.length;

    return (
      <div key={userMsg.id} className="group relative flex justify-end">
        {currentlyEditingMessageId === userMsg.id ? (
          <div className="w-full">
            <textarea
              value={editingContent}
              onChange={(e) => onEditingContentChange(e.target.value)}
              className="w-full rounded-md border p-2"
            />
            <div className="flex justify-end gap-2 p-1">
              <button onClick={() => onSaveEdit(userMsg.id)} aria-label="save-edit"><Check size={18} /></button>
              <button onClick={onCancelEdit} aria-label="cancel-edit"><X size={18} /></button>
            </div>
          </div>
        ) : (
          <div className="el-ai-message-user max-w-11/12 rounded-2xl rounded-br-none px-3 py-2">
            {contentToRender}
            <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100">
              <button onClick={() => onEnterEditMode(userMsg.id)} aria-label="edit" >
                <Pencil size={14} />
              </button>
            </div>
            {totalVersions > 1 && (
              <div className="version-switcher flex items-center justify-end gap-2 text-xs text-gray-500 pt-1">
                <button onClick={() => onSwitchUserVersion(userMsg.id, userMsg.activeVersionIndex - 1)} disabled={userMsg.activeVersionIndex === 0} className="disabled:opacity-20"><ChevronLeft size={16} /></button>
                <span>{userMsg.activeVersionIndex + 1}/{totalVersions}</span>
                <button onClick={() => onSwitchUserVersion(userMsg.id, userMsg.activeVersionIndex + 1)} disabled={userMsg.activeVersionIndex === totalVersions - 1} className="disabled:opacity-20"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  } else { // assistant
    const aiMsg = msg as AIMessage;
    const activeResponse = aiMsg.responses[aiMsg.activeResponseIndex];
    const contentToRender = activeResponse?.text || "";
    const totalResponses = aiMsg.responses.length;

    return (
      <div key={aiMsg.id} className="group relative flex">
        <div className="w-full">
          <Markdown source={contentToRender} />
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {totalResponses > 1 && (
                <div className="response-switcher flex items-center gap-2">
                  <button onClick={() => onSwitchResponse(aiMsg.id, aiMsg.activeResponseIndex - 1)} disabled={aiMsg.activeResponseIndex === 0} className="disabled:opacity-20"><ChevronLeft size={16} /></button>
                  <span>{aiMsg.activeResponseIndex + 1}/{totalResponses}</span>
                  <button onClick={() => onSwitchResponse(aiMsg.id, aiMsg.activeResponseIndex + 1)} disabled={aiMsg.activeResponseIndex === totalResponses - 1} className="disabled:opacity-20"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
            <div className="flex-1"></div> {/* Spacer */}
            {!aiMsg.isLoading && (
              <button onClick={() => onRetry(aiMsg.id)} aria-label="retry" className="opacity-0 group-hover:opacity-100">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          {aiMsg.isLoading && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
        </div>
      </div>
    );
  }
};