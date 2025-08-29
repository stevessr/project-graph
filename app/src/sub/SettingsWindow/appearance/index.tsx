import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Palette, Sparkles, Volume2 } from "lucide-react";
import { Fragment, useState } from "react";
import EffectsPage from "./effects";
import ThemePage from "./theme";
import SoundEffectsPage from "./sounds";

export default function AppearanceTab() {
  const [currentCategory, setCurrentCategory] = useState("");

  // @ts-expect-error fuck ts
  const Component = currentCategory && currentCategory in categories ? categories[currentCategory].component : Fragment;
  return (
    <div className="flex h-full">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(categories).map(([k, v]) => (
                  <SidebarMenuItem key={k}>
                    <SidebarMenuButton asChild onClick={() => setCurrentCategory(k)} isActive={currentCategory === k}>
                      <div>
                        <v.icon />
                        <span>{v.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="mx-auto flex w-2/3 flex-col overflow-auto">
        <Component />
      </div>
    </div>
  );
}

const categories = {
  theme: {
    name: "主题",
    icon: Palette,
    component: ThemePage,
  },
  effects: {
    name: "特效",
    icon: Sparkles,
    component: EffectsPage,
  },
  sounds: {
    name: "音效",
    icon: Volume2,
    component: SoundEffectsPage,
  },
};
