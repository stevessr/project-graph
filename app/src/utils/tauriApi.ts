import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isWeb } from "./platform";
const smartfetch = isWeb ? fetch : tauriFetch;
export { invoke, smartfetch as fetch };
