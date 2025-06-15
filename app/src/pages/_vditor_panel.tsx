import { useEffect, useRef, useState } from "react";
import type Vditor from "vditor";

export default function MarkdownEditor({
  defaultValue = "",
  onChange,
  id = "",
  className = "",
  options = {},
}: {
  defaultValue?: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  options?: Omit<IOptions, "after" | "input">;
}) {
  const [vd, setVd] = useState<Vditor>();
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 在每次展开面板都会调用一次这个函数 v1.4.13
    let vditor: Vditor | null = null;

    const initVditor = async () => {
      // Dynamic import to reduce initial bundle size
      const [{ default: VditorClass }] = await Promise.all([import("vditor"), import("vditor/dist/index.css")]);

      if (!el.current) return;

      vditor = new VditorClass(el.current, {
        after: () => {
          vditor?.setValue(defaultValue);
          setVd(vditor);
        },
        // input 有问题，只要一输入内容停下来的时候就被迫失去焦点了。
        blur: (value: string) => {
          onChange(value);
        },
        theme: "dark",
        preview: {
          theme: {
            current: "dark",
          },
          hljs: {
            style: "darcula",
          },
        },
        cache: { enable: false },
        ...options,
      });

      if (vditor) {
        setTimeout(() => {
          vditor?.focus();
        }, 100);
      }
    };

    initVditor().catch(console.error);

    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, [defaultValue]);

  return (
    <div
      ref={el}
      id={id}
      className={className}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    />
  );
}
