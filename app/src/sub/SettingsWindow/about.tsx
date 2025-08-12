import logoUrl from "@/assets/icon.png";
import { Dialog } from "@/components/ui/dialog";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect, useState } from "react";

export default function AboutTab() {
  const [appVersion, setAppVersion] = useState("unknown");
  const [logoClickCount, setLogoClickCount] = useState(0);

  useEffect(() => {
    (async () => {
      setAppVersion(await getVersion());
    })();
  }, []);
  useEffect(() => {
    (async () => {
      if (logoClickCount >= 10) {
        const url = await Dialog.input("navigate", "此操作将放弃所有未保存的文件");
        if (url && url.length > 5) {
          window.location.href = url;
        }
        setLogoClickCount(0);
      }
    })();
  }, [logoClickCount]);

  return (
    <div className="max-w-1/2 items-between mx-auto flex h-full w-full flex-col justify-center gap-4">
      <img src={logoUrl} alt="Project Graph Logo" className="absolute inset-0 -z-10 size-full blur-[150px]" />
      <img
        src={logoUrl}
        alt="Project Graph Logo"
        className="mx-auto size-64"
        onClick={() => setLogoClickCount((it) => it + 1)}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Project Graph</h1>
          <p className="text-sm opacity-50">图形化思维与知识管理桌面应用</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="border-border text-foreground inline-flex items-center rounded-md border px-2 py-1 text-xs">
            v{appVersion}
          </span>
        </div>
      </header>

      <section className="text-sm leading-6">
        <p>
          Project Graph 是一个图形化思维桌面工具和知识管理系统，支持节点连接、图形渲染和自动布局等功能， 基于 Tauri +
          React 技术栈构建。它旨在提供一个高效、直观的方式来组织和管理个人知识。
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-md border p-4">
          <div className="text-xs opacity-50">开发者</div>
          <div className="mt-1 font-medium">Littlefean, zty012, 以及所有贡献者</div>
        </div>
        <div className="**:cursor-pointer cursor-pointer rounded-md border p-4">
          <div className="text-xs opacity-50">仓库</div>
          <div
            className="mt-1 font-medium underline underline-offset-4"
            onClick={() => open("https://github.com/graphif/project-graph")}
          >
            graphif/project-graph
          </div>
        </div>
      </section>

      <footer className="text-xs opacity-50">{/**/}</footer>
    </div>
  );
}
