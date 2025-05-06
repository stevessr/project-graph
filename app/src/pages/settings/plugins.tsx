import { invoke } from "@tauri-apps/api/core";
import { open as openFile } from "@tauri-apps/plugin-dialog";
import { BookOpen, Box, PartyPopper, Plug, X } from "lucide-react";
import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import { Field } from "../../components/Field";
import Switch from "../../components/Switch";
import { readTextFile } from "../../utils/fs";
import { Window } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

import { useState } from "react"; // Add useState import

export default function PluginsPage() {
  const { t } = useTranslation("plugins");

  const [url, setUrl] = useState(""); // Add url state

  /**
   * 从本地安装插件
   * @returns
   */
  const install = async () => {
    const path = await openFile({
      filters: [
        {
          name: "JavaScript",
          extensions: ["js"],
        },
      ],
    });
    if (!path) return;

    // 开始解析插件内容代码格式

    const code = await readTextFile(path);
    // 解析插件内容，判断是否符合插件格式要求
    console.log(code);
    // const { pluginData, error, success } = parsePluginCode(code);

    // if (!success) {
    //   console.error(error);
    //   Dialog.show({
    //     title: "Error",
    //     content: error,
    //     type: "error",
    //     });
    //   return;
    // }

    // const { name, author, permission } = pluginData;

    // await Dialog.show({
    //   title: t("install.warning.title"),
    //   content: t("install.warning.content", {
    //     name: "plugin name",
    //     author: "author author",
    //     permission: ["perm1", "perm2", "perm3"],
    //   }),
    //   type: "warning",
    //   buttons: [
    //     {
    //       text: t("install.button.cancel"),
    //     },
    //     {
    //       text: t("install.button.install"),
    //     },
    //   ],
    // });
  };

  return (
    <>
      <Field
        icon={<PartyPopper />}
        title={t("welcome.title")}
        color="celebrate"
        description={t("welcome.description")}
      ></Field>
      <Field icon={<Plug />} title={t("title")}>
        <Button onClick={install}>
          <Box />
          {t("install")}
        </Button>
        <Button onClick={() => open("https://project-graph.top")}>
          <BookOpen />
          {t("documentation")}
        </Button>
      </Field>
      <Field icon={<Terminal />} title={t("core.console")}>
        <Button
          onClick={() => invoke("open_devtools")} // Call the new Tauri command
        >
          {t("open")}
        </Button>
      </Field>

      {/* New URL Opener Section */}
      <Field icon={<BookOpen />} title={t("openUrl.title")} description={t("openUrl.description")}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("openUrl.placeholder")}
          className="mr-2 w-full rounded border p-2" // Added w-full and mr-2 for better layout
        />
        <Button
          onClick={async () => {
            if (url) {
              try {
                // Generate a unique label for the new window
                const label = `${Date.now()}`;
                const appWindow = new Window(label);
                const webview = new Webview(appWindow, label, {
                  url: url,
                  x: 0,
                  y: 0,
                  width: 800,
                  height: 600,
                  devtools: true,
                });
                console.log("webview", webview);
                webview.once("tauri://created", function () {
                  // webview successfully created
                });
                // Optional: Handle window events (e.g., error loading)
                webview.once("tauri://error", function (e) {
                  console.error(`Failed to create webview window ${label}:`, e);
                  // Optionally show an error to the user
                });
              } catch (error) {
                console.error("Failed to open URL in new window:", error);
                // Optionally show a user-friendly error message here
              }
            }
          }}
        >
          {t("openUrl.button")}
        </Button>
      </Field>

      {/* 核心插件，不能卸载 */}
      <Field icon={<Plug />} title={t("core.title")} description={t("core.description")}>
        <Button disabled>
          <X />
          {t("uninstall")}
        </Button>
        <Switch value={true} onChange={() => {}} disabled />
      </Field>
    </>
  );
}
