import { isWeb } from "./platform.tsx";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

/**
 * A universal fetch function that works across web and Tauri environments.
 * It intelligently switches between `window.fetch` on the web and the
 * `@tauri-apps/plugin-http` fetch implementation in a Tauri application.
 *
 * @param url The URL to fetch.
 * @param options The request options, compatible with the standard `fetch` API.
 * @returns A promise that resolves to a standard `Response` object.
 */
export const universalFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  let finalUrl: string;
  if (typeof url === "string") {
    finalUrl = url;
  } else if (url instanceof URL) {
    finalUrl = url.href;
  } else {
    finalUrl = url.url;
  }

  if (isWeb) {
    return window.fetch(finalUrl, options);
  }

  try {
    const response = (await tauriFetch(finalUrl, options as any)) as unknown as Response;
    return response;
  } catch (error) {
    console.error("Tauri fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: "Tauri fetch failed", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
