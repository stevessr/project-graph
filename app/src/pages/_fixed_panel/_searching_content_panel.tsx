import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import IconButton from "../../components/IconButton";
import { Stage } from "../../core/stage/Stage";
import { CaseSensitive, CaseUpper } from "lucide-react";
import Input from "../../components/Input";
import { StageManager } from "../../core/stage/stageManager/StageManager";
import { Camera } from "../../core/stage/Camera";

/**
 * 搜索内容的面板
 */
export default function SearchingContentPanel({ open = false, className = "" }: { open: boolean; className: string }) {
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [searchString, setSearchString] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; uuid: string }[]>([]);

  useEffect(() => {
    const input = document.querySelector(".search-panel-input") as HTMLInputElement;
    if (open) {
      // 获取焦点，搜索框
      if (input) {
        input.focus();
      }
    } else {
      // 取消搜索框的焦点
      if (input) {
        input.blur();
      }
    }
  }, [open]);

  return (
    <div
      className={cn(
        "bg-panel-bg text-panel-text fixed -left-72 top-16 flex h-full w-72 flex-col rounded-md p-4 pb-20 transition-all",
        {
          "left-0": open,
        },
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h1>搜索内容</h1>
        <div className="text-panel-details-text flex h-8 items-center justify-center text-xs">
          {isCaseSensitive ? "大小写敏感" : "大小写不敏感"}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Input
          placeholder="请输入要搜索的内容"
          className="search-panel-input"
          onChange={(value) => {
            setSearchString(value);
            Stage.contentSearchEngine.startSearch(value, false);
            setSearchResults(
              Stage.contentSearchEngine.searchResultNodes.map((node) => ({
                title: Stage.contentSearchEngine.getStageObjectText(node),
                uuid: node.uuid,
              })),
            );
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.altKey || e.metaKey) {
              // 取消默认事件
              e.preventDefault();
            } else if (e.key === "Escape") {
              if (searchString !== "") {
                // 取消搜索
                setSearchString("");
                setSearchResults([]);
              }
            }
          }}
          value={searchString}
        />
        <IconButton
          onClick={() => {
            const currentResult = !isCaseSensitive;
            setIsCaseSensitive(currentResult);
            Stage.contentSearchEngine.isCaseSensitive = currentResult;
          }}
        >
          {isCaseSensitive ? <CaseSensitive /> : <CaseUpper />}
        </IconButton>
      </div>
      <div className="overflow-y-auto">
        {searchResults.map((result, index) => (
          <div
            key={result.uuid}
            className={cn("hover:text-panel-success-text cursor-pointer truncate", {
              "bg-panel-bg-active": index === Stage.contentSearchEngine.currentSearchResultIndex,
            })}
            onClick={() => {
              const node = StageManager.getStageObjectByUUID(result.uuid);
              if (node) {
                Camera.location = node.collisionBox.getRectangle().center;
              }
            }}
          >
            <span className="bg-settings-page-bg mr-0.5 rounded-sm px-1">{index + 1}</span>
            {result.title}
          </div>
        ))}
      </div>
    </div>
  );
}
