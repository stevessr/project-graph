import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { fetch } from "@tauri-apps/plugin-http";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UserWindow() {
  const [status, setStatus] = useState<"loading" | "ok" | "out">("loading");
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    (async () => {
      const loginApiResponse = await (await fetch("https://bbs.project-graph.top/api/login")).text();
      if (loginApiResponse.startsWith('"')) {
        setStatus("ok");
        // "/user/<username>"
        const userDataEndpoint = loginApiResponse.slice(1, -1);
        const userData = await (await fetch(`https://bbs.project-graph.top/api${userDataEndpoint}`)).json();
        setUser(userData);
      } else {
        setStatus("out");
      }
    })();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {status === "loading" && <span>加载中...</span>}
      {status === "out" && <span>未登录</span>}
      {status === "ok" && (
        <>
          <div className="flex items-center gap-2">
            <img src={`https://bbs.project-graph.top${user.uploadedpicture}`} crossOrigin="" className="size-12" />
            <div className="flex flex-col gap-1">
              <span>{user.username}</span>
              <span className="text-sm opacity-50">UID: {user.uid}</span>
            </div>
          </div>
          <Button
            onClick={() => {
              fetch("https://bbs.project-graph.top/logout", {
                method: "POST",
              });
              toast.success("已退出登录");
            }}
          >
            <LogOut />
            退出登录
          </Button>
        </>
      )}
    </div>
  );
}

UserWindow.open = () => {
  SubWindow.create({
    title: "用户",
    children: <UserWindow />,
    rect: Rectangle.inCenter(new Vector(230, 240)),
  });
};
