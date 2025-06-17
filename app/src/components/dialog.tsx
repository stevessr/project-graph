// src\components\dialog.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { Rectangle } from "../core/dataStruct/shape/Rectangle";
import { Vector } from "../core/dataStruct/Vector";
import { SubWindow } from "../core/service/SubWindow";
import { cn } from "../utils/cn";
import Input from "./Input";

export namespace Dialog {
  export type DialogButton = {
    text: string;
    color: "white" | "green" | "red" | "blue" | "yellow";
    onClick?: (value?: string) => void;
  };
  export type DialogType = "info" | "success" | "warning" | "error";
  export type DialogOptions = {
    title: string;
    content: string;
    type: DialogType;
    buttons: Partial<DialogButton>[];
    code: string;
    input: boolean;
  };
  export type DialogProps = DialogOptions & {
    onClose: (button: string, value?: string) => void;
  };

  export type DialogShowFunc = (options: Partial<DialogOptions>) => Promise<{
    button: string;
    value?: string;
  }>;

  /**
   * @example
   * Dialog.show({
   *   title: "标题",
   *   content: "内容",
   *   type: "info",
   *   buttons: [
   *     { text: "确定", color: "green", onClick: () => {} },
   *     { text: "取消", color: "red", onClick: () => {} },
   *   ],
   * });
   *
   * # 带有输入框的对话框
   *
   * Dialog.show({
   *     title: "重命名边",
   *     input: true,
   *   }).then(({ button, value }) => {
   *     if (button === "确定") {
   *       if (value) {
   *         // StageManager is not defined here, this is just an example
   *         // for (const edge of StageManager.getLineEdges()) {
   *         //   if (edge.isSelected) {
   *         //     edge.rename(value);
   *         //   }
   *         // }
   *       }
   *     }
   *   });
   * @param options
   * @returns
   */
  export function show(options: Partial<DialogOptions>): Promise<{
    button: string;
    value?: string;
  }> {
    return new Promise((resolve) => {
      // 检查是否在桌面/混合应用环境中
      if (typeof SubWindow !== "undefined" && typeof SubWindow.create === "function") {
        const win = SubWindow.create({
          children: (
            <Component
              {...options}
              onClose={(button, value) => {
                resolve({ button, value });
                SubWindow.close(win.id);
              }}
            />
          ),
          rect: new Rectangle(new Vector(200, 200), new Vector(400, 300)),
          titleBarOverlay: true,
        });
      } else {
        // 否则，使用标准的Web浏览器环境逻辑
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(
          <Component
            {...options}
            onClose={(button, value) => {
              resolve({ button, value });
              root.unmount();
              container.remove();
            }}
          />,
        );
      }
    });
  }

  const colorClasses = {
    white: "text-white hover:bg-white/10",
    green: "text-green-400 hover:bg-green-400/10",
    red: "text-red-400 hover:bg-red-400/10",
    blue: "text-blue-400 hover:bg-blue-400/10",
    yellow: "text-yellow-400 hover:bg-yellow-400/10",
  };

  function Component({
    title = "",
    type = "info",
    content = "",
    code = "",
    buttons = [{ text: "确定", color: "white", onClick: () => {} }],
    input = false,
    onClose = () => {},
  }: Partial<Dialog.DialogProps>) {
    const [inputValue, setInputValue] = React.useState("");
    const [isCopied, setIsCopied] = React.useState(false);

    return (
      <div
        data-pg-drag-region
        className={cn("flex h-full flex-col gap-4 text-wrap break-words p-8", {
          "bg-blue-950": type === "info",
          "bg-green-950": type === "success",
          "bg-yellow-950": type === "warning",
          "bg-red-950": type === "error",
        })}
      >
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex-1 overflow-auto">
          {content.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {code.trim() !== "" && (
          <div className="flex flex-col gap-2">
            <pre
              className="cursor-copy select-text overflow-auto rounded-md bg-neutral-900 p-2 text-sm text-white"
              onClick={() => {
                navigator.clipboard.writeText(code).then(
                  () => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 1000);
                  },
                  (err) => {
                    console.error("复制失败：", err);
                  },
                );
              }}
            >
              <code>{code}</code>
            </pre>
            {isCopied && <span className="text-xs text-green-400">已复制</span>}
          </div>
        )}
        {input && <Input value={inputValue} onChange={setInputValue} placeholder="请输入" className="dialog-input" />}

        <div className="flex justify-end gap-2">
          {buttons.map((btn, i) => (
            <div
              key={i}
              onClick={() => {
                try {
                  btn.onClick?.(inputValue);
                } catch (error) {
                  console.error("Dialog button onClick error:", error);
                } finally {
                  onClose(btn.text ?? "", inputValue);
                }
              }}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 active:scale-90",
                colorClasses[btn.color ?? "white"],
                btn.text === "确定" && "dialog-confirm-btn",
              )}
            >
              {btn.text}
            </div>
          ))}
        </div>
        <div className="fixed left-0 top-0 z-[-1] h-full w-full bg-black opacity-0"></div>
      </div>
    );
  }
}
