import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom, store } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useState } from "react";
import AppearanceTab from "./appearance";
import KeyBindsPage from "./keybinds";
import SettingsTab from "./settings";

type TabName = "settings" | "keybinds" | "appearance" | "startFile";

export default function SettingsWindow({ defaultTab = "settings" }: { defaultTab?: TabName }) {
  const [currentTab, setCurrentTab] = useState<TabName>(defaultTab);

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab as any} className="h-full gap-0 overflow-hidden">
      <div className="flex">
        <TabsList>
          <TabsTrigger value="settings">设置</TabsTrigger>
          <TabsTrigger value="keybinds">快捷键</TabsTrigger>
          <TabsTrigger value="appearance">个性化</TabsTrigger>
          <TabsTrigger value="startFile">启动文件</TabsTrigger>
        </TabsList>
        <div data-pg-drag-region className="h-full flex-1" />
      </div>
      <TabsContent value="settings" className="overflow-auto">
        <SettingsTab />
      </TabsContent>
      <TabsContent value="keybinds" className="overflow-auto">
        <KeyBindsPage />
      </TabsContent>
      <TabsContent value="appearance" className="overflow-auto">
        <AppearanceTab />
      </TabsContent>
    </Tabs>
  );
}

// TODO: page参数
SettingsWindow.open = (tab: TabName = "settings") => {
  store.get(activeProjectAtom)?.pause();
  SubWindow.create({
    children: <SettingsWindow defaultTab={tab} />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
  });
};
