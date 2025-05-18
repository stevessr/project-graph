// src/core/ai/helpers/apiCaller.ts
import { fetch as tauriFetch } from "../../../utils/tauriApi";
import { FetchResponseLike } from "./types"; // Using our defined ResponseLike

export interface ApiCallOptions {
  method: "POST" | "GET" | "PUT" | "DELETE"; // Common methods
  headers: HeadersInit;
  body?: string; // Body is stringified JSON
}

export async function makeApiCall(apiUrl: string, options: ApiCallOptions): Promise<FetchResponseLike> {
  // tauriFetch is expected to return a Response-like object
  // compatible with FetchResponseLike
  return tauriFetch(apiUrl, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  }) as unknown as FetchResponseLike; // Cast if tauriFetch has a slightly different signature but compatible structure
}
