import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { fetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-shell";
import { Check, ExternalLink, KeyRound, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginWindow() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    // 获取 CSRF Token
    const loginPageHtml = await (await fetch("https://bbs.project-graph.top/login")).text();
    const csrfTokenMatch = loginPageHtml.match(/"csrf_token":"([a-z0-9]+)"/);
    if (!csrfTokenMatch) {
      throw new Error("获取 CSRF Token 失败");
    }
    const csrfToken = csrfTokenMatch[1];
    // 发送登录请求，获取 Cookie
    const response = await fetch("https://bbs.project-graph.top/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: username,
        password: password,
        noscript: "false",
        remember: "on",
        _csrf: csrfToken,
      }).toString(),
    });
    if (response.status !== 200) {
      const data = await response.text();
      if (data === "Forbidden") {
        throw new Error("CSRF Token 不正确");
      } else if (data === "[[error:invalid-login-credentials]]") {
        throw new Error("无效的登录凭证");
      }
      return;
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <span className="flex items-center gap-4">
        <User />
        <Input placeholder="邮箱 / 用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      </span>
      <span className="flex items-center gap-4">
        <KeyRound />
        <Input placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </span>
      <span className="flex gap-4">
        <Button
          onClick={() =>
            toast.promise(login, {
              loading: "正在登录...",
              success: "登录成功",
              error: (err) => `登录失败: ${err.message}`,
            })
          }
        >
          <Check />
          登录
        </Button>
        <Button variant="outline" onClick={() => open("https://bbs.project-graph.top/register")}>
          <ExternalLink />
          前往注册
        </Button>
      </span>
    </div>
  );
}

LoginWindow.open = () => {
  SubWindow.create({
    title: "登录",
    children: <LoginWindow />,
    rect: Rectangle.inCenter(new Vector(230, 240)),
  });
};
