import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { CaseSensitive, SquareDashedMousePointer, Telescope } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 搜索内容的面板
 */
export default function FindWindow() {
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [searchString, setSearchString] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; uuid: string }[]>([]);
  // 是否开启快速瞭望模式
  const [isMouseEnterCameraMovable, setIsMouseEnterCameraMovable] = useState(true);
  const [project] = useAtom(activeProjectAtom);

  const selectAllResult = () => {
    for (const result of searchResults) {
      const node = project?.stageManager.get(result.uuid);
      if (node) {
        node.isSelected = true;
      }
    }
    toast.success(`${searchResults.length} 个结果已全部选中`);
  };

  useEffect(() => {
    if (!project) return;
    project.contentSearch.isCaseSensitive = isCaseSensitive;
  }, [project, isCaseSensitive]);

  if (!project) return <></>;
  return (
    <div className="flex flex-col gap-2 p-4">
      <Input
        placeholder="请输入要在舞台上搜索的内容"
        autoFocus
        type="search"
        onChange={(e) => {
          setSearchString(e.target.value);
          project.contentSearch.startSearch(e.target.value, false);
          setSearchResults(
            project.contentSearch.searchResultNodes.map((node) => ({
              title: project.contentSearch.getStageObjectText(node),
              uuid: node.uuid,
            })),
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (searchString !== "") {
              // 取消搜索
              setSearchString("");
              setSearchResults([]);
            }
          }
        }}
        value={searchString}
      />
      <div className="my-1 flex flex-wrap gap-3">
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant={isCaseSensitive ? "default" : "outline"}
              onClick={() => {
                const currentResult = !isCaseSensitive;
                setIsCaseSensitive(currentResult);
              }}
            >
              <CaseSensitive />
            </Button>
          </TooltipTrigger>
          <TooltipContent>区分大小写</TooltipContent>
        </Tooltip>
        {searchResults.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="outline" onClick={selectAllResult}>
                <SquareDashedMousePointer />
              </Button>
            </TooltipTrigger>
            <TooltipContent>将全部结果选中</TooltipContent>
          </Tooltip>
        )}

        {searchResults.length >= 3 && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="icon"
                variant={isMouseEnterCameraMovable ? "default" : "outline"}
                onClick={() => {
                  setIsMouseEnterCameraMovable(!isMouseEnterCameraMovable);
                }}
              >
                <Telescope />
              </Button>
            </TooltipTrigger>
            <TooltipContent>快速瞭望模式</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {searchResults.map((result) => (
          <div
            key={result.uuid}
            className="hover:text-panel-success-text flex cursor-pointer truncate"
            onMouseEnter={() => {
              if (isMouseEnterCameraMovable) {
                const node = project.stageManager.get(result.uuid);
                if (node) {
                  project.camera.bombMove(node.collisionBox.getRectangle().center);
                }
              }
            }}
            onClick={() => {
              const node = project.stageManager.get(result.uuid);
              if (node) {
                project.camera.bombMove(node.collisionBox.getRectangle().center);
              }
            }}
          >
            {/*<span className="bg-secondary rounded-sm px-2 py-1">{index + 1}</span>*/}
            {result.title}
          </div>
        ))}
      </div>
    </div>
  );
}

FindWindow.open = () => {
  SubWindow.create({
    title: "搜索",
    children: <FindWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(300, 300)),
  });
};
