import { Settings } from "@/core/service/Settings";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import FileChooser from "@/components/ui/file-chooser";

// 音效配置列表
const SOUND_CONFIGS = [
  { settingKey: "cuttingLineStartSoundFile", name: "开始切割", testFunction: SoundService.play.cuttingLineStart },
  { settingKey: "cuttingLineReleaseSoundFile", name: "释放切割", testFunction: SoundService.play.cuttingLineRelease },
  { settingKey: "connectLineStartSoundFile", name: "开始连接", testFunction: SoundService.play.connectLineStart },
  { settingKey: "connectFindTargetSoundFile", name: "找到连接目标", testFunction: SoundService.play.connectFindTarget },
  { settingKey: "alignAndAttachSoundFile", name: "对齐吸附", testFunction: SoundService.play.alignAndAttach },
  { settingKey: "uiButtonEnterSoundFile", name: "按钮悬停", testFunction: SoundService.play.mouseEnterButton },
  { settingKey: "uiButtonClickSoundFile", name: "按钮点击", testFunction: SoundService.play.mouseClickButton },
  {
    settingKey: "uiSwitchButtonOnSoundFile",
    name: "开关开启",
    testFunction: SoundService.play.mouseClickSwitchButtonOn,
  },
  {
    settingKey: "uiSwitchButtonOffSoundFile",
    name: "开关关闭",
    testFunction: SoundService.play.mouseClickSwitchButtonOff,
  },
];

export default function SoundEffectsPage() {
  const { t } = useTranslation("sounds");
  const [soundEnabled] = Settings.use("soundEnabled");

  // 测试音效
  const handleTestSound = (testFunction: () => void) => {
    if (soundEnabled) {
      testFunction();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted flex items-center justify-between rounded-lg p-4">
        <div className="flex items-center gap-2">
          {soundEnabled ? <Volume2 /> : <VolumeX />}
          <span>{t("soundEnabled")}</span>
        </div>
        <Switch
          checked={soundEnabled}
          onCheckedChange={(value: boolean) => {
            Settings.soundEnabled = value;
          }}
        />
      </div>

      {soundEnabled && (
        <div className="space-y-2">
          {SOUND_CONFIGS.map(({ settingKey, name, testFunction }) => {
            const [filePath] = Settings.use(settingKey as any);
            return (
              <div key={settingKey} className="bg-muted flex items-center justify-between rounded-lg p-4">
                <div className="flex w-full flex-col">
                  <span>{name}</span>
                  <FileChooser
                    kind="file"
                    value={filePath || ""}
                    onChange={(value) => {
                      Settings[settingKey as keyof typeof Settings] = value;
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="hover:bg-accent rounded-full p-2"
                    onClick={() => handleTestSound(testFunction)}
                    disabled={!filePath}
                    title={t("testSound")}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!soundEnabled && (
        <div className="bg-muted/50 text-muted-foreground rounded-lg p-4 text-center">
          <p>{t("soundDisabledHint")}</p>
        </div>
      )}
      <p>提示：目前此页面有一个bug：需要切换一下页面再切回来，才能看到改动的效果</p>
    </div>
  );
}
