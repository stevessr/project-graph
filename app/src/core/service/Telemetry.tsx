import { getDeviceId } from "../../utils/otherApi";
import { FeatureFlags } from "./FeatureFlags";
import { fetch } from "../../utils/tauriApi";

export namespace Telemetry {
  let deviceId = "";

  export async function event(type: string, data: any) {
    if (!FeatureFlags.TELEMETRY) {
      return;
    }
    if (!deviceId) {
      deviceId = await getDeviceId();
    }
    await fetch(import.meta.env.LR_API_BASE_URL + "/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data,
        deviceId,
      }),
    });
  }
}
