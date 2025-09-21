import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import _ from "lodash";
import { ChevronRight, MinusCircle, Palette, Plus, Save, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ThemeEditor({ themeId }: { themeId: string }) {
  const [theme, setTheme] = useState<Themes.Theme | null>(null);

  useEffect(() => {
    Themes.getThemeById(themeId).then(setTheme);
  }, [themeId]);

  function save() {
    if (!theme) return;
    // 检查是否修改了id
    if (theme.metadata.id !== themeId) {
      // 删除原来的主题
      Themes.deleteCustomTheme(themeId).then(() => {
        // 保存新的主题
        Themes.writeCustomTheme(theme).then(() => {
          toast.success("主题 ID 已修改，请重新打开此页面，否则可能出现问题");
        });
      });
    } else {
      Themes.writeCustomTheme(theme).then(() => {
        toast.success("主题已保存，部分更改将在重新打开此页面后生效");
      });
    }
  }
  function apply() {
    if (!theme) return;
    Settings.theme = theme.metadata.id;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex gap-2">
        <Button onClick={save}>
          <Save />
          保存
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            save();
            apply();
          }}
        >
          <Palette />
          保存并应用
        </Button>
      </div>
      <Collapsible className="group/collapsible rounded-lg border px-4 py-3">
        <CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <span>元数据</span>
            <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2">
            <Tag />
            <span>ID</span>
            <Input
              value={theme?.metadata.id ?? ""}
              onChange={(e) => {
                setTheme((theme) => {
                  if (!theme) return theme;
                  return _.set(_.cloneDeep(theme), "metadata.id", e.target.value);
                });
              }}
            />
          </div>
          <span>名称</span>
          <KeyValueEditor
            value={theme?.metadata.name ?? {}}
            onChange={(newData) => {
              setTheme((theme) => {
                if (!theme) return theme;
                return _.set(_.cloneDeep(theme), "metadata.name", newData);
              });
            }}
          />
          <span>描述</span>
          <KeyValueEditor
            value={theme?.metadata.description ?? {}}
            onChange={(newData) => {
              setTheme((theme) => {
                if (!theme) return theme;
                return _.set(_.cloneDeep(theme), "metadata.description", newData);
              });
            }}
          />
          <span>作者</span>
          <KeyValueEditor
            value={theme?.metadata.author ?? {}}
            onChange={(newData) => {
              setTheme((theme) => {
                if (!theme) return theme;
                return _.set(_.cloneDeep(theme), "metadata.author", newData);
              });
            }}
          />
        </CollapsibleContent>
      </Collapsible>
      <ColorsEditor
        value={theme?.content ?? {}}
        onChange={(newData) => {
          setTheme((theme) => {
            if (!theme) return theme;
            return _.set(_.cloneDeep(theme), "content", newData);
          });
        }}
      />
    </div>
  );
}

function KeyValueEditor({
  value: data,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (newData: Record<string, string>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(data).map(([lang, value]) => (
        <div className="flex gap-2" key={lang}>
          <Input
            value={lang}
            onChange={(e) => {
              const newData = { ...data };
              delete newData[lang];
              onChange({
                ...newData,
                [e.target.value]: value,
              });
            }}
            className="w-32"
          />
          <Input
            value={value}
            onChange={(e) => {
              onChange({
                ...data,
                [lang]: e.target.value,
              });
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              const newData = { ...data };
              delete newData[lang];
              onChange(newData);
            }}
          >
            <MinusCircle />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={() => {
          onChange({
            ...data,
            "": "",
          });
        }}
      >
        <Plus />
        添加语言
      </Button>
    </div>
  );
}

function ColorsEditor({
  value,
  onChange,
}: {
  value: Record<string, any>;
  onChange: (newValue: Record<string, any>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(value).map(([k, v]) => (
        <div className="hover:bg-accent/50 flex items-center gap-2 transition-colors" key={k}>
          <span className="w-64 shrink-0">{k}</span>
          {typeof v === "string" ? (
            <div className="flex items-center gap-2">
              <div className="aspect-square size-8 rounded-full" style={{ background: v }} />
              <Input value={v} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
              <div className="relative">
                <Palette />
                <input
                  type="color"
                  value={v}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                  className="absolute inset-0 z-10 opacity-0"
                />
              </div>
            </div>
          ) : (
            <ColorsEditor value={v} onChange={(newV) => onChange({ ...value, [k]: newV })} />
          )}
        </div>
      ))}
    </div>
  );
}
