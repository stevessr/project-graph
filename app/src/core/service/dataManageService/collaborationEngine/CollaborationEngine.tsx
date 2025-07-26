import { universalFetch } from "../../../../utils/fetch";
import { Dialog } from "../../../../components/dialog";

export namespace CollaborationEngine {
  export async function openStartCollaborationPanel() {
    const servers: string[] = await (
      await universalFetch((import.meta.env.LR_API_BASE_URL ?? "http://localhost:8787") + "/coserver/list")
    ).json();
    // 测试服务器延迟
    const times = await Promise.all(
      servers.map(async (s) => {
        try {
          const start = Date.now();
          universalFetch(s);
          const end = Date.now();
          return end - start;
        } catch {
          return 999;
        }
      }),
    );
    // 获取最快的服务器
    const fastestServer = servers[times.indexOf(Math.min(...times))];
    // 弹窗
    await Dialog.show({
      title: "Start Collaboration",
      content: `You can start collaboration with ${fastestServer}`,
      buttons: [
        {
          text: "Start",
          onClick: () => {},
        },
        {
          text: "Cancel",
          onClick: () => {},
        },
      ],
    });
  }
}
