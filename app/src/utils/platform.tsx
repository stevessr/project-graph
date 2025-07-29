import { getCurrentWindow as tauriGetCurrentWindow, Window } from "@tauri-apps/api/window";
import { family as osFamily, platform } from "@tauri-apps/plugin-os";

export const isWeb = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isTauri = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isMobile = isWeb ? navigator.userAgent.toLowerCase().includes("mobile") : platform() === "android";
export const isDesktop = !isMobile;

export const isIpad = isWeb && navigator.userAgent.toLowerCase().includes("mac os");

export const isFrame =
  isWeb && (new URLSearchParams(window.location.search).get("frame") === "true" || import.meta.env.LR_FRAME === "true");

export const isMac = !isWeb && platform() === "macos";
export const isWindows = !isWeb && platform() === "windows";
export const isLinux = !isWeb && platform() === "linux";

export const isTest = import.meta.env.LR_VITEST === "true";

export function family() {
  if (isWeb) {
    // 从userAgent判断unix|windows
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      return "windows";
    } else {
      return "unix";
    }
  } else {
    return osFamily();
  }
}

export function getCurrentWindow(): Window {
  if (isWeb) {
    return new Proxy(
      {},
      {
        get() {
          return async () => {};
        },
      },
    ) as Window;
  } else {
    return tauriGetCurrentWindow();
  }
}
