import { Speaker } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import { Field } from "../../../components/Field";
import Select from "../../../components/Select";
import { AIEngine } from "../../../core/service/dataManageService/aiEngine/AIEngine";
import { Settings } from "../../../core/service/Settings";

// Helper function to convert raw PCM data to a WAV file format
function pcmToWav(pcmData: ArrayBuffer): ArrayBuffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.byteLength;
  const fileSize = 44 + dataSize; // 44 bytes for the header

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize - 8, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // 16 for PCM
  view.setUint16(20, 1, true); // Linear quantization (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // 16 bits per sample

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write the PCM data
  const pcmBytes = new Uint8Array(pcmData);
  for (let i = 0; i < dataSize; i++) {
    view.setUint8(44 + i, pcmBytes[i]);
  }

  return buffer;
}

export function GeminiTTSGenerator() {
  const { t } = useTranslation("settings");
  const [aiModelGeminiTTS, setAiModelGeminiTTS] = Settings.use("aiModelGeminiTTS");
  const [geminiTtsLanguage, setGeminiTtsLanguage] = Settings.use("geminiTtsLanguage");
  const [text, setText] = useState("Say cheerfully: Have a wonderful day!");
  const [voiceName, setVoiceName] = useState("Kore");
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const ttsVoices = [
    { label: "Zephyr: Bright, Higher pitch", value: "Zephyr" },
    { label: "Puck: Upbeat, Middle pitch", value: "Puck" },
    { label: "Charon: Informative, Lower pitch", value: "Charon" },
    { label: "Kore: Firm, Middle pitch", value: "Kore" },
    { label: "Fenrir: Excitable, Lower middle pitch", value: "Fenrir" },
    { label: "Leda: Youthful, Higher pitch", value: "Leda" },
    { label: "Orus: Firm, Lower middle pitch", value: "Orus" },
    { label: "Aoede: Breezy, Middle pitch", value: "Aoede" },
    { label: "Callirrhoe: Easy-going, Middle pitch", value: "Callirrhoe" },
    { label: "Autonoe: Bright, Middle pitch", value: "Autonoe" },
    { label: "Enceladus: Breathy, Lower pitch", value: "Enceladus" },
    { label: "Iapetus: Clear, Lower middle pitch", value: "Iapetus" },
    { label: "Umbriel: Easy-going, Lower middle pitch", value: "Umbriel" },
    { label: "Algieba: Smooth, Lower pitch", value: "Algieba" },
    { label: "Despina: Smooth, Middle pitch", value: "Despina" },
    { label: "Erinome: Clear, Middle pitch", value: "Erinome" },
    { label: "Algenib: Gravelly, Lower pitch", value: "Algenib" },
    { label: "Rasalgethi: Informative, Middle pitch", value: "Rasalgethi" },
    { label: "Laomedeia: Upbeat, Higher pitch", value: "Laomedeia" },
    { label: "Achernar: Soft, Higher pitch", value: "Achernar" },
    { label: "Alnilam: Firm, Lower middle pitch", value: "Alnilam" },
    { label: "Schedar: Even, Lower middle pitch", value: "Schedar" },
    { label: "Gacrux: Mature, Middle pitch", value: "Gacrux" },
    { label: "Pulcherrima: Forward, Middle pitch", value: "Pulcherrima" },
    { label: "Achird: Friendly, Lower middle pitch", value: "Achird" },
    { label: "Zubenelgenubi: Casual, Lower middle pitch", value: "Zubenelgenubi" },
    { label: "Vindemiatrix: Gentle, Middle pitch", value: "Vindemiatrix" },
    { label: "Sadachbia: Lively, Lower pitch", value: "Sadachbia" },
    { label: "Sadaltager: Knowledgeable, Middle pitch", value: "Sadaltager" },
    { label: "Sulafat: Warm, Middle pitch", value: "Sulafat" },
  ];

  const handleGenerateTTS = async (): Promise<void> => {
    setIsLoading(true);
    setAudioSrc(null);
    try {
      const instance = await AIEngine.getInstance();
      if (instance.generateTTS) {
        // 1. Get the raw PCM data as an ArrayBuffer from the API
        const pcmData = await instance.generateTTS(text, voiceName);

        // 2. Convert the raw PCM data to a WAV format ArrayBuffer
        const wavBuffer = pcmToWav(pcmData);

        // 3. Create a Blob from the WAV ArrayBuffer with the correct MIME type
        const blob = new Blob([wavBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioSrc(url);
      } else {
        console.error("TTS function is not available for the current AI provider.");
      }
    } catch (error) {
      console.error("Failed to generate TTS:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);


  return (
    <div
      className="settings-group mt-4 p-4 border rounded-lg"
      style={{
        backgroundColor: "var(--dialog-warning-bg)",
        borderColor: "var(--dialog-warning-bg)",
      }}
    >
      <h4
        className="flex items-center gap-2 text-base font-semibold mb-2"
        style={{ color: "var(--text)" }}
      >
        <Speaker className="w-5 h-5" />
        {t("ai.gemini.tts.experimentalTitle", "实验性 TTS 音频生成")}
      </h4>
      <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
        {t("ai.gemini.tts.description", "输入文本，然后点击生成按钮来创建音频。音频将以 24kHz 的采样率、S16LE 格式的 PCM 数据返回。注意：此功能需要 ffmpeg 才能正常工作。")}
      </p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-2 border rounded-md"
        rows={3}
      />
      
      <div className="mt-4">
        <Field title={t("ai.gemini.tts.voice", "音色")}>
          <Select
            options={ttsVoices}
            value={voiceName}
            onUpdate={(v) => setVoiceName(v as string)}
          />
        </Field>
        <Field title={t("ai.gemini.tts.model", "模型")}>
          <Select
            options={[
              { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 flash TTS" },
              { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
            ]}
            value={aiModelGeminiTTS}
            onUpdate={setAiModelGeminiTTS}
          />
        </Field>
        <Field title={t("ai.language", "TTS 语言")}>
          <Select
            options={[
              { label: "英语 (美国)", value: "en-US" },
              { label: "英语 (英国)", value: "en-GB" },
              { label: "西班牙语 (西班牙)", value: "es-ES" },
              { label: "法语 (法国)", value: "fr-FR" },
              { label: "德语 (德国)", value: "de-DE" },
              { label: "意大利语 (意大利)", value: "it-IT" },
              { label: "葡萄牙语 (巴西)", value: "pt-BR" },
            ]}
            value={geminiTtsLanguage}
            onUpdate={(v) => setGeminiTtsLanguage(v as string)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <Button onClick={handleGenerateTTS} disabled={isLoading}>
          {isLoading ? t("ai.gemini.tts.generating", "生成中...") : t("ai.gemini.tts.generate", "生成音频")}
        </Button>
        {audioSrc && (
          <audio controls src={audioSrc}>
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
    </div>
  );
}