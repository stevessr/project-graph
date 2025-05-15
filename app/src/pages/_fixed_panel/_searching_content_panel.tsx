import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import IconButton from "../../components/IconButton";
import { Stage } from "../../core/stage/Stage";
import { CaseSensitive, CaseUpper, Delete, SquareDashedMousePointer, Telescope } from "lucide-react";
import Input from "../../components/Input";
import { StageManager } from "../../core/stage/stageManager/StageManager";
import { Camera } from "../../core/stage/Camera";
import { TextRiseEffect } from "../../core/service/feedbackService/effectEngine/concrete/TextRiseEffect";

/**
 * 搜索内容的面板
 */
export default function SearchingContentPanel({ open = false, className = "" }: { open: boolean; className: string }) {
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [searchString, setSearchString] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; uuid: string }[]>([]);
  // 是否开启快速瞭望模式
  const [isMouseEnterMoveCameraAble, setIsMouseEnterMoveCameraAble] = useState(false);

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

  const selectAllResult = () => {
    for (const result of searchResults) {
      const node = StageManager.getStageObjectByUUID(result.uuid);
      if (node) {
        node.isSelected = true;
      }
    }
    Stage.effectMachine.addEffect(TextRiseEffect.default(`${searchResults.length}个结果已全部选中`));
  };

  return (
    <div
      className={cn(
        "bg-panel-bg text-panel-text fixed -left-72 top-16 flex h-full w-72 flex-col rounded-md p-2 pb-20 transition-all",
        {
          "left-0": open,
        },
        className,
      )}
    >
      <div className="my-1 flex justify-between">
        <IconButton
          onClick={() => {
            const currentResult = !isCaseSensitive;
            setIsCaseSensitive(currentResult);
            Stage.contentSearchEngine.isCaseSensitive = currentResult;
          }}
          tooltip={isCaseSensitive ? "当前状态：大小写敏感" : "当前状态：大小写不敏感"}
        >
          {isCaseSensitive ? <CaseSensitive /> : <CaseUpper />}
        </IconButton>
        <IconButton onClick={selectAllResult} tooltip={"将全部结果选中"} disabled={searchResults.length === 0}>
          <SquareDashedMousePointer />
        </IconButton>

        {searchResults.length >= 3 && (
          <IconButton
            onClick={() => {
              setIsMouseEnterMoveCameraAble(!isMouseEnterMoveCameraAble);
            }}
            tooltip={isMouseEnterMoveCameraAble ? "快速瞭望模式" : "点击跳转模式"}
          >
            <Telescope />
          </IconButton>
        )}

        <IconButton
          onClick={() => {
            setSearchString("");
            Stage.contentSearchEngine.startSearch("", false);
            setSearchResults([]);
          }}
          tooltip={"删除输入内容与结果"}
        >
          <Delete />
        </IconButton>
      </div>

      <Input
        placeholder="请输入要在舞台上搜索的内容"
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
      <div className="overflow-y-auto">
        {searchResults.map((result, index) => (
          <div
            key={result.uuid}
            className={cn("hover:text-panel-success-text cursor-pointer truncate", {
              "bg-panel-bg-active": index === Stage.contentSearchEngine.currentSearchResultIndex,
            })}
            onMouseEnter={() => {
              if (isMouseEnterMoveCameraAble) {
                const node = StageManager.getStageObjectByUUID(result.uuid);
                if (node) {
                  Camera.location = node.collisionBox.getRectangle().center;
                }
              }
            }}
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
