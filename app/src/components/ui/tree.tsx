import { cn } from "@/utils/cn";
import { Check, ChevronRight, X } from "lucide-react";
import { useState } from "react";

export default function Tree({ obj, deep = 0, className = "" }: { obj: any; deep?: number; className?: string }) {
  const [fold, setFold] = useState(true);

  return (
    <div className={cn("flex flex-col", className)}>
      <ChevronRight
        className={cn("cursor-pointer transition", {
          "rotate-90": !fold,
          hidden: !(((typeof obj === "object" && obj !== null) || obj instanceof Array) && deep > 0),
        })}
        onClick={(ev) => {
          ev.stopPropagation();
          setFold((prev) => !prev);
        }}
      />
      {((typeof obj === "object" && obj !== null) || obj instanceof Array) && deep > 0 && fold ? (
        <></>
      ) : // undefined是值，提前检测
      typeof obj === "undefined" ? (
        <span className="opacity-75">undefined</span>
      ) : // null属于对象，提前检测
      obj === null ? (
        <span className="opacity-75">null</span>
      ) : // 布尔值
      typeof obj === "boolean" ? (
        obj ? (
          <Check className="text-indigo-300" />
        ) : (
          <X className="text-indigo-300" />
        )
      ) : // 数字
      typeof obj === "number" ? (
        <span className="text-indigo-300">{obj}</span>
      ) : // 其他对象
      typeof obj === "object" ? (
        Object.entries(obj).map(([k, v]) => (
          <div
            style={{
              marginLeft: `${deep * 4}px`,
            }}
            key={k}
            className="flex gap-2"
          >
            <span className="inline text-green-400">{obj instanceof Array ? <>[{k}]</> : <>{k}</>}: </span>
            <Tree obj={v} deep={deep + 1} />
          </div>
        ))
      ) : (
        // 其他所有类型
        obj
      )}
    </div>
  );
}
