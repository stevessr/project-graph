import { readFile } from "@tauri-apps/plugin-fs";
import { readFile } from "../../../utils/fs"; // Assuming this correctly reads binary files into Uint8Array
import { StringDict } from "../../dataStruct/StringDict";
import { Settings } from "../Settings";

/**
 * 播放音效的服务
 * 这个音效播放服务是用户自定义的
 */
export namespace SoundService {
  let cuttingLineStartSoundFile = "";
  let connectLineStartSoundFile = "";
  let connectFindTargetSoundFile = "";
  let cuttingLineReleaseSoundFile = "";
  let alignAndAttachSoundFile = "";
  let uiButtonEnterSoundFile = "";
  let uiButtonClickSoundFile = "";
  let uiSwitchButtonOnSoundFile = "";
  let uiSwitchButtonOffSoundFile = "";

  export function init() {
    Settings.watch("cuttingLineStartSoundFile", (value) => {
      cuttingLineStartSoundFile = value;
    });
    Settings.watch("connectLineStartSoundFile", (value) => {
      connectLineStartSoundFile = value;
    });
    Settings.watch("connectFindTargetSoundFile", (value) => {
      connectFindTargetSoundFile = value;
    });
    Settings.watch("cuttingLineReleaseSoundFile", (value) => {
      cuttingLineReleaseSoundFile = value;
    });
    Settings.watch("alignAndAttachSoundFile", (value) => {
      alignAndAttachSoundFile = value;
    });
    Settings.watch("uiButtonEnterSoundFile", (value) => {
      uiButtonEnterSoundFile = value;
    });
    Settings.watch("uiButtonClickSoundFile", (value) => {
      uiButtonClickSoundFile = value;
    });
    Settings.watch("uiSwitchButtonOnSoundFile", (value) => {
      uiSwitchButtonOnSoundFile = value;
    });
    Settings.watch("uiSwitchButtonOffSoundFile", (value) => {
      uiSwitchButtonOffSoundFile = value;
    });
  }

  export namespace play {
    export function cuttingLineStart() {
      loadAndPlaySound(cuttingLineStartSoundFile);
    }
    export function connectLineStart() {
      loadAndPlaySound(connectLineStartSoundFile);
    }
    export function connectFindTarget() {
      loadAndPlaySound(connectFindTargetSoundFile);
    }
    export function cuttingLineRelease() {
      loadAndPlaySound(cuttingLineReleaseSoundFile);
    }
    export function alignAndAttach() {
      loadAndPlaySound(alignAndAttachSoundFile);
    }
    export function mouseEnterButton() {
      loadAndPlaySound(uiButtonEnterSoundFile);
    }
    export function mouseClickButton() {
      loadAndPlaySound(uiButtonClickSoundFile);
    }
    export function mouseClickSwitchButtonOn() {
      loadAndPlaySound(uiSwitchButtonOnSoundFile);
    }
    export function mouseClickSwitchButtonOff() {
      loadAndPlaySound(uiSwitchButtonOffSoundFile);
    }
  }

  let audioContextInstance: AudioContext | null = null;
  let audioContextInitializationAttempted = false;

  // Function to get or initialize AudioContext
  function getAudioContext(): AudioContext | null {
    if (!audioContextInitializationAttempted) {
      audioContextInitializationAttempted = true;
      // Check for AudioContext availability (standard and webkit-prefixed for older Safari)
      if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
        try {
          audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
          console.error("SoundService: Failed to create AudioContext instance.", e);
          audioContextInstance = null; // Ensure it's null on failure
        }
      } else {
        // AudioContext is not available in this environment (e.g., Node.js during tests)
        // Sounds will be disabled. You can log a warning here if desired.
        // console.warn("SoundService: AudioContext not available. Sound playback will be disabled.");
      }
    }
    return audioContextInstance;
  }

  export function playSoundByFilePath(filePath: string) {
    loadAndPlaySound(filePath);
  }

  async function loadAndPlaySound(filePath: string) {
    if (filePath.trim() === "") {
      return;
    }

    const ac = getAudioContext();
    if (!ac) {
      // AudioContext not available, so we can't play sounds.
      // console.warn(`SoundService: AudioContext not available. Cannot play sound: ${filePath}`);
      return;
    }

    try {
      const audioBuffer = await getAudioBufferByFilePath(filePath);
      if (!audioBuffer) {
        // Failed to get or decode audio buffer
        // console.warn(`SoundService: Could not get AudioBuffer for ${filePath}.`);
        return;
      }
      const source = ac.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ac.destination);
      source.start(0);
    } catch (error) {
      console.error(`SoundService: Error playing sound ${filePath}:`, error);
    }
  }

  const pathAudioBufferMap = new Map<string, AudioBuffer>();

  async function getAudioBufferByFilePath(filePath: string) {
    // 先从缓存中获取音频数据
    const result = pathAudioBufferMap.get(filePath);
    if (result) {
      return result;
    }

    // First, try to get the audio data from cache
    const cachedBuffer = pathAudioBufferMap.getById(filePath);
    if (cachedBuffer) {
      return cachedBuffer;
    }

    // If not in cache, read and decode the file
    try {
      const uint8Array = await readFile(filePath); // This should return Uint8Array
      // `uint8Array.buffer` is already an ArrayBuffer
      const arrayBuffer = uint8Array.buffer;

      const audioBuffer = await ac.decodeAudioData(arrayBuffer);

      // Add to cache
      pathAudioBufferMap.setById(filePath, audioBuffer);

    // 加入缓存
    pathAudioBufferMap.set(filePath, audioBuffer);

    return audioBuffer;
  }
}
